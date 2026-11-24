// 읽기 가이드 (리딩 룰러)
// 결과 글을 문장 단위로 나눠 한 줄에 한 문장씩 넣고,
// 화면에 보이는 줄 중 지금 읽는 한 줄만 선명하게, 나머지 줄은 흐리게 보여 준다.
// 앞 줄 / 뒤 줄 버튼(또는 ← / → 키)으로 지금 읽는 줄을 옮긴다.
(() => {
  const output = document.querySelector('#reading-text');
  const guideToggle = document.querySelector('#reading-guide');
  const prevButton = document.querySelector('.arrow-btn--left');
  const nextButton = document.querySelector('.arrow-btn--right');
  const styleBar = document.querySelector('.style-bar');
  if (!output || !guideToggle || !prevButton || !nextButton) return;

  // 입력 화면이 넘겨준 글과 언어
  let source;
  try {
    source = JSON.parse(sessionStorage.getItem('readly.source'));
  } catch {
    // 페이지를 바로 열면 저장된 글이 없을 수 있다.
  }
  if (!source || typeof source.text !== 'string' || !source.text.trim()) {
    // '읽을 글이 없어요' 안내는 헷갈리는 글자 강조(confusable-letters.js)가 보여 준다.
    guideToggle.disabled = true;
    return;
  }
  const lang = ['ko', 'en'].includes(source.lang) ? source.lang : 'ko';

  // 문단 구분 없이 이어서 보여 주므로 줄바꿈은 공백 하나로 바꾼다.
  const text = source.text.replace(/\s*[\r\n]+\s*/g, ' ').trim();

  // 글을 문장 목록으로 나눈다. 문장 뒤의 공백은 그 문장에 붙어 있다.
  function splitSentences(value) {
    if ('Segmenter' in Intl) {
      const segmenter = new Intl.Segmenter(lang, { granularity: 'sentence' });
      return Array.from(segmenter.segment(value), part => part.segment);
    }
    // Intl.Segmenter가 없는 브라우저: 문장 부호 뒤에 공백이 있을 때만 나눈다.
    return value.match(/.+?(?:[.!?…]+(?=\s|$)\s*|$)/g) || [value];
  }

  // 문장마다 <span class="sentence-item">으로 감싸서 결과 칸에 넣는다.
  // CSS에서 문장 하나를 한 줄씩 보여 주므로, 문장 뒤 공백은 넣지 않는다.
  const sentences = splitSentences(text)
    .map(part => part.trim())
    .filter(Boolean)
    .map(body => {
      const item = document.createElement('span');
      item.className = 'sentence-item';
      item.textContent = body;
      return item;
    });
  output.replaceChildren(...sentences);
  // 헷갈리는 글자 강조(confusable-letters.js)가 새로 넣은 글에 다시 색을 입히도록
  // 강조 스위치에 change 신호를 보낸다. (confusable-letters.js가 먼저 실행된 뒤 이 파일이 실행된다)
  document.querySelector('#highlight')?.dispatchEvent(new Event('change'));

  // 읽기 영역 위에 얹을 덮개: 현재 줄 배경(band), 현재 줄 위·아래를 흐리게 덮는 판(mask) 2개
  const reading = output.parentElement;
  const band = document.createElement('div');
  const maskTop = document.createElement('div');
  const maskBottom = document.createElement('div');
  band.className = 'reading-ruler__band';
  maskTop.className = 'reading-ruler__mask';
  maskBottom.className = 'reading-ruler__mask';
  [band, maskTop, maskBottom].forEach(el => el.setAttribute('aria-hidden', 'true'));
  reading.classList.add('has-ruler');
  reading.append(band, maskTop, maskBottom);

  // 화면에 그려진 줄 목록: { top, bottom, start(줄 첫 글자 번호), sentence(문장 번호) }
  // 화면에 그려진 줄 목록: { top, bottom, start(줄 첫 글자 번호), sentence(문장 번호) }
  // top·bottom은 글 칸(#reading-text) 위쪽 끝을 0으로 한 위치라서, 페이지를 스크롤해도 바뀌지 않는다.
  let lines = [];
  let current = 0;
  // 다시 계산해도 보던 곳을 잃지 않도록, 지금 줄의 첫 글자 번호를 기억한다.
  let anchor = 0;

  // 글자 하나하나의 화면 위치를 재서, 같은 높이에 있는 글자끼리 한 줄로 묶는다.
  // 띄어쓰기는 줄이 꺾이는 자리에서 위치가 정확하지 않을 수 있어서 재지 않는다.
  function measureLines() {
    const result = [];
    const range = document.createRange();
    const origin = output.getBoundingClientRect().top;
    const maxHeight = parseFloat(getComputedStyle(output).fontSize) * 2;
    let index = 0;
    sentences.forEach((item, sentenceIndex) => {
      const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        for (let i = 0; i < node.length; i++, index++) {
          if (/\s/.test(node.data[i])) continue;
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const rect = range.getBoundingClientRect();
          // 크기가 없거나, 두 줄에 걸쳐 잡힌(너무 높은) 위치는 건너뛴다.
          if (!rect.height || rect.height > maxHeight) continue;
          const top = rect.top - origin;
          const bottom = rect.bottom - origin;
          const line = result[result.length - 1];
          const middle = (top + bottom) / 2;
          if (!line || middle > line.bottom) {
            result.push({ top, bottom, start: index, sentence: sentenceIndex });
          } else {
            line.top = Math.min(line.top, top);
            line.bottom = Math.max(line.bottom, bottom);
          }
        }
      }
    });
    return result;
  }

  // 줄 목록을 새로 계산하고, 기억해 둔 글자가 있는 줄을 다시 찾는다.
  function refresh() {
    lines = measureLines();
    if (!lines.length) return;
    current = 0;
    lines.forEach((line, index) => {
      if (line.start <= anchor) current = index;
    });
    update();
  }

  // 덮개 위치와 문장 표시를 지금 줄에 맞춘다.
  function update() {
    const isOn = guideToggle.checked && lines.length > 0;
    [band, maskTop, maskBottom].forEach(el => { el.hidden = !isOn; });
    sentences.forEach((item, index) => {
      const isCurrent = isOn && index === lines[current].sentence;
      item.classList.toggle('is-current', isCurrent);
      if (isCurrent) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
    if (!isOn) return;

    // 덮개 좌표는 읽기 영역(.reading) 기준이다. 글 칸이 읽기 영역 안에서 어디 있는지 구한다.
    const base = reading.getBoundingClientRect();
    const box = output.getBoundingClientRect();
    const boxTop = box.top - base.top;
    const boxBottom = boxTop + box.height;
    const left = box.left - base.left;
    const width = box.width;
    const line = lines[current];
    const prev = lines[current - 1];
    const next = lines[current + 1];
    // 줄 경계: 위·아래 줄과의 가운데. 첫 줄·마지막 줄은 글 칸의 끝까지.
    const top = prev ? boxTop + (prev.bottom + line.top) / 2 : boxTop;
    const bottom = next ? boxTop + (line.bottom + next.top) / 2 : boxBottom;

    place(band, left, top, width, bottom - top);
    place(maskTop, left, boxTop, width, top - boxTop);
    place(maskBottom, left, bottom, width, boxBottom - bottom);
  }

  function place(el, left, top, width, height) {
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.width = width + 'px';
    el.style.height = Math.max(height, 0) + 'px';
  }

  // 지금 줄을 step만큼 옮긴다. 첫 줄과 마지막 줄에서는 멈춘다.
  function move(step) {
    if (!guideToggle.checked) return;
    // 줄 위치가 바뀌었을 수 있으니 옮기기 전에 다시 잰다.
    refresh();
    if (!lines.length) return;
    const next = Math.min(Math.max(current + step, 0), lines.length - 1);
    if (next === current) return;
    current = next;
    anchor = lines[current].start;
    update();
    band.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  prevButton.addEventListener('click', () => move(-1));
  nextButton.addEventListener('click', () => move(1));
  guideToggle.addEventListener('change', update);

  // 버튼에 표시된 ← / → 키로도 옮긴다. 입력 칸·슬라이더를 조작할 때는 무시
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft') move(-1);
    else if (event.key === 'ArrowRight') move(1);
    else return;
    event.preventDefault();
  });

  // 줄 위치가 바뀔 수 있는 순간마다 다시 계산
  // 1) 창 크기나 글 칸 크기가 바뀔 때
  new ResizeObserver(() => refresh()).observe(output);
  // 2) 글꼴 파일을 다 불러왔을 때
  document.fonts.ready.then(refresh);
  document.fonts.addEventListener('loadingdone', refresh);
  // 3) 보기 설정(글꼴·자간·행간, 헷갈리는 글자 강조)을 바꿀 때
  styleBar?.addEventListener('input', () => requestAnimationFrame(refresh));
  styleBar?.addEventListener('change', () => requestAnimationFrame(refresh));

  refresh();
})();