// 소리로 듣기 (TTS)
// 브라우저에 들어 있는 음성 합성 기능(Web Speech API)으로 결과 글을 한 문장씩 읽어 준다.
// 읽는 문장은 읽기 가이드(reading-guide.js)의 지금 문장과 같이 움직인다.
(() => {
  const playButton = document.querySelector('#tts-play');
  const playLabel = document.querySelector('#tts-play-label');
  const rateInput = document.querySelector('#tts-rate');
  const status = document.querySelector('#tts-status');
  const output = document.querySelector('#reading-text');
  const guide = window.readingGuide;
  if (!playButton || !playLabel || !rateInput || !status || !output) return;

  // 읽을 글이 없으면(읽기 가이드가 준비되지 않았으면) 버튼을 끈다.
  if (!guide || !guide.count) {
    playButton.disabled = true;
    return;
  }

  // 브라우저가 음성 합성을 지원하지 않으면 안내하고 버튼을 끈다.
  if (!('speechSynthesis' in window)) {
    playButton.disabled = true;
    status.textContent = '이 브라우저는 소리로 듣기를 지원하지 않아요.';
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel(); // 새로고침 전에 읽던 소리가 남아 있으면 멈춘다.

  let isPlaying = false;
  let utterance = null; // 지금 읽고 있는 문장
  let finished = false; // 마지막 문장까지 다 읽었는지
  let voices = [];

  // 사용할 수 있는 음성 목록. 브라우저에 따라 늦게 채워져서 voiceschanged를 기다린다.
  function loadVoices() {
    voices = synth.getVoices();
  }
  loadVoices();
  synth.addEventListener('voiceschanged', loadVoices);

  // 문장에 한글이 있으면 한국어, 없으면 영어로 읽는다.
  function languageOf(text) {
    return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text) ? 'ko-KR' : 'en-US';
  }

  // 언어에 맞는 음성을 고른다. 없으면 기본 음성을 쓰고 안내한다.
  function voiceFor(lang) {
    const prefix = lang.slice(0, 2);
    const voice = voices.find(v => v.lang.replace('_', '-') === lang)
      || voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (!voice && voices.length) {
      status.textContent = lang === 'ko-KR'
        ? '한국어 음성이 없어 발음이 부정확할 수 있어요.'
        : '영어 음성이 없어 발음이 부정확할 수 있어요.';
    }
    return voice || null;
  }

  // 버튼 글자와 상태를 바꾼다.
  function setPlaying(playing) {
    isPlaying = playing;
    playLabel.textContent = playing ? '일시정지' : '소리로 듣기';
    playButton.setAttribute('aria-pressed', String(playing));
  }

  // index번 문장을 읽는다. 다 읽으면 다음 문장으로 넘어간다.
  function speak(index) {
    synth.cancel();
    guide.goTo(index, 'tts');
    const text = guide.textAt(index);
    const lang = languageOf(text);
    const next = new SpeechSynthesisUtterance(text);
    next.lang = lang;
    next.voice = voiceFor(lang);
    next.rate = Number(rateInput.value) / 10;

    next.addEventListener('end', () => {
      if (utterance !== next || !isPlaying) return; // 멈추거나 다른 문장으로 바뀐 뒤면 무시
      if (index < guide.count - 1) {
        speak(index + 1);
      } else {
        finished = true;
        setPlaying(false);
      }
    });

    next.addEventListener('error', event => {
      if (utterance !== next) return;
      // 멈춤·다른 문장으로 이동할 때 생기는 중단은 오류가 아니다.
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      setPlaying(false);
      status.textContent = '소리로 읽는 중에 문제가 생겼어요. 다시 눌러 주세요.';
    });

    utterance = next;
    synth.speak(next);
  }

  function play() {
    status.textContent = '';
    setPlaying(true);
    // 끝까지 다 읽은 뒤 다시 누르면 처음부터, 아니면 지금 문장부터 읽는다.
    const start = finished ? 0 : guide.current;
    finished = false;
    speak(start);
  }

  // 일시정지: 소리를 멈추고, 다시 누르면 지금 문장의 처음부터 읽는다.
  function pause() {
    setPlaying(false);
    utterance = null;
    synth.cancel();
  }

  playButton.addEventListener('click', () => (isPlaying ? pause() : play()));

  // 읽는 중에 앞/뒤 문장 버튼으로 옮기면, 옮긴 문장부터 다시 읽는다.
  output.addEventListener('readly:sentence-change', event => {
    finished = false;
    if (isPlaying && event.detail.source !== 'tts') speak(event.detail.index);
  });

  // Space 키로 재생/일시정지. 입력 칸이나 버튼에 커서가 있을 때는 원래 동작을 따른다.
  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.repeat) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, select, textarea, button, a, [contenteditable="true"]')) return;
    event.preventDefault();
    isPlaying ? pause() : play();
  });

  // 페이지를 떠나면 읽기를 멈춘다.
  window.addEventListener('pagehide', () => synth.cancel());
})();