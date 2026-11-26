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

  // 글은 읽기 가이드(reading-guide.js)가 문장별로 넣어둠, 칸 비움 X.
  // 이미 들어 있는 글자에 색만 입히기 ON/OFF.
  function render() {
    output.querySelectorAll('.confusable').forEach(mark => mark.replaceWith(mark.textContent));
    output.normalize();
    if (!toggle.checked) return;
    const walker = document.createTreeWalker(output, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    const letters = new Intl.Segmenter('ko', { granularity: 'grapheme' });
    for (const node of textNodes) {
      const fragment = document.createDocumentFragment();
      let plain = '';
      for (const { segment: char } of letters.segment(node.data)) {
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
      node.replaceWith(fragment);
    }
  }
  toggle.addEventListener('change', render);
  render();
})();
