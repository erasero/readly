(() => {
  const output = document.querySelector('#reading-text');
  const toggle = document.querySelector('#highlight');
  let source;
  try {
    source = JSON.parse(sessionStorage.getItem('readly.source'));
  } catch {
    // Storage may be unavailable when opening the page directly.
  }
  if (!source || typeof source.text !== 'string' || !source.text.trim()) {
    output.textContent = '읽을 글이 없어요. 텍스트 입력으로 돌아가 글을 넣어 주세요.';
    toggle.disabled = true;
    return;
  }
  if (['ko', 'en'].includes(source.lang)) output.lang = source.lang;

function highlightClass(letter) {
  const parts = letter.normalize('NFD');

  if (/[dqㅍᄑᇁᆵ]/i.test(parts)) return 'confusable paired-letter';
  if (/[bpㅂᄇᆸᆹᆲ]/i.test(parts)) return 'confusable';

  return '';
}

  function render() {
    output.textContent = '';
    if (!toggle.checked) {
      output.textContent = source.text;
      return;
    }
    const fragment = document.createDocumentFragment();
    let plain = '';
    const letters = new Intl.Segmenter('ko', { granularity: 'grapheme' });
    for (const { segment: char } of letters.segment(source.text)) {
      const className = highlightClass(char);
      if (!className) {
        plain += char;
        continue;
      }
      fragment.append(plain);
      plain = '';
      const mark = document.createElement('span');
      mark.className = className;
      mark.textContent = char;
      fragment.append(mark);
    }
    fragment.append(plain);
    output.append(fragment);
  }
  toggle.addEventListener('change', render);
  render();
})();
