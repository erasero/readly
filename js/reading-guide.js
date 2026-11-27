// 읽기 가이드
// 결과 글을 문장 단위로 나눠 한 줄에 한 문장씩 넣고, 지금 읽는 문장만 선명하게 보여 준다.
// 앞 문장 / 뒤 문장 버튼(또는 ← / → 키)으로 지금 읽는 문장을 옮긴다.
(() => {
  const output = document.querySelector('#reading-text');
  const guideToggle = document.querySelector('#reading-guide');
  const prevButton = document.querySelector('.arrow-btn--left');
  const nextButton = document.querySelector('.arrow-btn--right');
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

  let current = 0;

  // 지금 문장 표시와 가이드 켜짐 상태를 화면에 반영한다.
  function update() {
    output.classList.toggle('is-guided', guideToggle.checked);
    sentences.forEach((item, index) => {
      const isCurrent = index === current;
      item.classList.toggle('is-current', isCurrent);
      if (isCurrent && guideToggle.checked) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  }

    // 지금 문장을 index번 문장으로 옮긴다. 첫 문장과 마지막 문장에서는 멈춘다.
  // source는 누가 옮겼는지('guide': 버튼·키, 'tts': 소리로 듣기)를 알려 준다.
  function goTo(index, source = 'guide') {
    const next = Math.min(Math.max(index, 0), sentences.length - 1);
    if (next === current) return;
    current = next;
    update();
    if (guideToggle.checked) sentences[current].scrollIntoView({ block: 'nearest' });
    output.dispatchEvent(new CustomEvent('readly:sentence-change', { detail: { index: current, source } }));
  }

  // 버튼·키로 지금 문장을 step만큼 옮긴다.
  function move(step) {
    if (!guideToggle.checked) return;
    goTo(current + step);
  }

  // TTS(tts.js)가 문장 목록과 지금 문장을 쓸 수 있게 열어 둔다.
  window.readingGuide = {
    get count() { return sentences.length; },
    get current() { return current; },
    textAt: index => sentences[index].textContent,
    goTo,
  };
  
  prevButton.addEventListener('click', () => move(-1));
  nextButton.addEventListener('click', () => move(1));
  guideToggle.addEventListener('change', update);

  // 버튼에 표시된 ← / → 키로도 옮긴다. 입력 칸·슬라이더를 조작할 때는 무시한다.
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft') move(-1);
    else if (event.key === 'ArrowRight') move(1);
    else return;
    event.preventDefault();
  });

  update();
})();