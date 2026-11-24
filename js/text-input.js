(() => {
  const form = document.querySelector('.input-card');
  const input = form.elements.text;
  const fileInput = form.elements.textFile;
  const urlInput = form.elements.url;
  const status = document.querySelector('#input-status');
  const limit = input.maxLength;
  let loadedLink;
  let revision = 0;

  function invalidate() {
    revision++;
    status.textContent = '';
  }
  form.addEventListener('input', invalidate);
  form.querySelector('.tabs').addEventListener('focusin', invalidate);
  input.addEventListener('input', () => {
    document.querySelector('.textarea-count').textContent = input.value.length + ' / 1,000자';
  });
  fileInput.addEventListener('change', () => {
    status.textContent = fileInput.files[0]?.name || '';
  });

  async function readFile(file) {
    if (!file) throw new Error('파일을 선택해 주세요.');
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'txt') return file.text();
    if (ext === 'pdf') {
      const base = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
      const pdfjs = await import(base + 'pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
      try {
        let text = '';
        for (let i = 1; i <= pdf.numPages && text.length < limit; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => (item.str || '') + (item.hasEOL ? '\n' : ' ')).join('') + '\n';
        }
        return text;
      } finally {
        await pdf.destroy();
      }
    }
    if (ext === 'docx') {
      const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const xml = await zip.file('word/document.xml').async('string');
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
      return Array.from(doc.getElementsByTagNameNS(ns, 'p'), p =>
        Array.from(p.getElementsByTagNameNS(ns, '*'), node => {
          if (node.localName === 't') return node.textContent;
          if (node.localName === 'tab') return '\t';
          return node.localName === 'br' ? '\n' : '';
        }).join('')
      ).join('\n');
    }
    throw new Error('TXT, PDF 또는 DOCX 파일을 선택해 주세요.');
  }

  async function readLink() {
    const address = urlInput.value.trim();
    if (!/^https?:\/\//i.test(address) || !urlInput.validity.valid)
      throw new Error('http 또는 https로 시작하는 웹페이지 주소를 입력해 주세요.');
    if (loadedLink?.address === address) return loadedLink.text;
    const response = await fetch(address, { credentials: 'omit', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('페이지를 열 수 없어요. 주소를 확인해 주세요.');
    const type = response.headers.get('content-type') || '';
    const raw = await response.text();
    if (type.includes('text/plain')) return raw;
    if (!type.includes('text/html')) throw new Error('본문이 있는 웹페이지 주소를 입력해 주세요.');
    const template = document.createElement('template');
    template.innerHTML = raw;
    const body = template.content;
    body.querySelectorAll('script,style,head,title,nav,footer,header,noscript,[hidden]').forEach(el => el.remove());
    const article = body.querySelector('article') || body.querySelector('main') || body;
    article.querySelectorAll('br,p,div,li,h1,h2,h3,section').forEach(el => el.after('\n'));
    return article.textContent.trim();
  }

  async function process(submit) {
    const ticket = ++revision;
    const mode = form.querySelector('[aria-selected="true"]').id;
    const address = urlInput.value.trim();
    status.textContent = '텍스트를 확인하고 있어요…';
    try {
      let text = input.value;
      if (mode === 'tab-link') text = await readLink();
      if (mode === 'tab-file') text = await readFile(fileInput.files[0]);
      if (ticket !== revision) return;
      if (!text.trim()) throw new Error('읽을 글이 없어요. 텍스트를 직접 입력해 주세요.');
      text = text.slice(0, limit).replace(/[\uD800-\uDBFF]$/, '');
      if (mode === 'tab-link') loadedLink = { address, text };
      if (!submit) {
        status.textContent = '본문을 불러왔어요. 변환하기를 눌러 주세요.';
        return;
      }
      try {
        sessionStorage.setItem('readly.source', JSON.stringify({ text, lang: form.elements.lang.value }));
      } catch {
        throw new Error('브라우저의 저장 공간을 사용할 수 없어요. 사이트 저장 설정을 확인해 주세요.');
      }
      location.assign(form.action);
    } catch (error) {
      if (ticket !== revision) return;
      const fallback = mode === 'tab-link'
        ? '사이트가 외부 요청을 차단했거나 연결할 수 없어요. 본문을 복사해 직접 입력해 주세요.'
        : '파일을 읽을 수 없어요. 파일 형식과 인터넷 연결을 확인해 주세요.';
      status.textContent = error.constructor === Error && /[가-힣]/.test(error.message) ? error.message : fallback;
    }
  }
  form.querySelector('.link-input__fetch').addEventListener('click', () => process(false));
  form.addEventListener('submit', event => {
    event.preventDefault();
    process(true);
  });
})();
