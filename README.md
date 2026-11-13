# Readly

색각이상·난독증 사용자가 이미지, 동영상, 텍스트를 자신에게 맞게 변환해 볼 수 있는 웹 서비스입니다.

Team **Pajama Parties** · 2026 Open Software Platform

## 페이지 구성

| 페이지 | 파일 | CSS |
|---|---|---|
| 홈 | `index.html` | `css/home.css` |
| 이미지/동영상 업로드 | `pages/color-upload.html` | `css/color-upload.css` |
| 이미지 변환 결과 | `pages/image-result.html` | `css/image-result.css` |
| 동영상 변환 결과 | `pages/video-result.html` | `css/video-result.css` |
| 텍스트 업로드 | `pages/text-upload.html` | `css/text-upload.css` |
| 텍스트 변환 결과 | `pages/text-result.html` | `css/text-result.css` |
| 글쓰기 가이드 | `pages/writing.html` | `css/writing.css` |

## 폴더 구조

```
readly/
├── index.html          # 홈
├── pages/              # 나머지 페이지
├── css/
│   ├── common.css      # 디자인 토큰, 리셋, 헤더·푸터, 버튼·태그 등 공통 스타일
│   └── <page>.css      # 페이지별 스타일
├── js/                 # 기능별 스크립트 (2주차부터)
└── assets/
    ├── icons/
    └── images/
```

## 실행 방법

빌드 과정 없이 정적 파일로 동작합니다.

1. 저장소를 클론합니다.
2. VS Code의 **Live Server** 확장으로 `index.html`을 열거나, 브라우저에서 `index.html`을 바로 엽니다.

배포는 GitHub Pages(`main` 브랜치 루트)를 사용합니다.

## 작업 규칙

- **색상·글자 크기는 `css/common.css`의 변수(`--color-*`, `--fs-*`)를 사용합니다.** 값을 직접 쓰지 않아야 디자인이 한 번에 바뀝니다.
- 공통 스타일은 `common.css`, 한 페이지에서만 쓰는 스타일은 해당 페이지 CSS에 작성합니다.
- 기능 담당자는 `js/` 아래에 기능별 파일을 만듭니다. 예: `js/image-convert.js`, `js/tts.js`
- 커밋 메시지, 브랜치, Pull Request 규칙은 **[CONTRIBUTING.md](CONTRIBUTING.md)** 를 확인해 주세요.

## 역할

| 이름 | 담당 |
|---|---|
| Lee Jiahn | 이미지 색상 변환 |
| Kim Eunchae | 동영상 색상 변환 |
| Lee Gayeon | 텍스트 입력, 헷갈리는 글자 강조 |
| Oh Jiwoo | UI, 프론트엔드 (HTML/CSS) |
| Kim Dongha | 글쓰기 가이드 |
| Kim Naeun | 글꼴·자간 변환, TTS, 읽기 가이드 |
