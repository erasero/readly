// 글꼴·자간 변환
// 보기 설정의 글꼴·자간·행간 값이 바뀌면 읽기 영역(.reading)의 CSS 변수를 바꾼다.
// 글자 내용은 건드리지 않고 모양만 바꾸므로 다른 텍스트 기능과 함께 쓸 수 있다.
(() => {
  const reading = document.querySelector('.reading');
  const fontSelect = document.querySelector('#font-select');
  const letterSpacing = document.querySelector('#letter-spacing');
  const lineHeight = document.querySelector('#line-height');
  if (!reading || !fontSelect || !letterSpacing || !lineHeight) return;

  // 글꼴 목록 (CSS font-family 값)
  // 변환 글꼴: 영문은 OpenDyslexic, OpenDyslexic에 없는 한글은 Noto Sans KR로 표시된다.
  //           두 글꼴 파일은 assets/fonts에 있고, css/text-result.css의 @font-face로 연결한다.
  // 기본 글꼴: 사이트 기본 글꼴(common.css의 --font-base)로 되돌린다.
  const FONTS = {
    reading: '"OpenDyslexic", "Noto Sans KR", sans-serif',
    base: 'var(--font-base)',
  };

  // 현재 입력값을 CSS 변수에 반영한다.
  function apply() {
    reading.style.setProperty('--reading-font', FONTS[fontSelect.value] || FONTS.reading);
    reading.style.setProperty('--reading-letter-spacing', letterSpacing.value + 'em');
    reading.style.setProperty('--reading-line-height', lineHeight.value);
  }

  fontSelect.addEventListener('change', apply);
  letterSpacing.addEventListener('input', apply);
  lineHeight.addEventListener('input', apply);

  // 결과 화면에 들어오면 HTML에 적힌 기본값(자동 조절 기본값)을 바로 적용한다.
  apply();
})();