# 협업 가이드

깃을 처음 쓰는 팀원도 따라 할 수 있도록 최소한의 규칙만 정했습니다.

## 1. 커밋 메시지 양식

```
타입: 무엇을 했는지 한 줄로
```

| 타입 | 언제 쓰나요 | 예시 |
|---|---|---|
| `feat` | 새 기능을 추가했을 때 | `feat: 이미지 업로드 기능 추가` |
| `fix` | 버그를 고쳤을 때 | `fix: TTS가 두 번 재생되는 문제 수정` |
| `style` | 화면 모양(HTML/CSS)만 바꿨을 때 | `style: 홈 카드 hover 효과 수정` |
| `docs` | 문서(README 등)를 수정했을 때 | `docs: 실행 방법 추가` |
| `refactor` | 동작은 같고 코드만 정리했을 때 | `refactor: 업로드 함수 분리` |
| `chore` | 설정, 파일 정리 등 기타 작업 | `chore: 폴더 구조 정리` |

**규칙**
- 타입은 영어 소문자, 콜론(`:`) 뒤에 한 칸 띄우고 한국어로 씁니다.
- 끝에 마침표를 찍지 않습니다.
- "수정", "작업함"처럼 모호하게 쓰지 않고 **무엇을** 했는지 씁니다.
  - ❌ `fix: 수정`
  - ✅ `fix: 텍스트 업로드 글자 수 표시 오류 수정`
- 한 커밋에는 한 가지 작업만 담습니다. 여러 작업을 했다면 나눠서 커밋합니다.

## 2. 브랜치 규칙

`main`은 배포되는 브랜치라서 **직접 푸시하지 않습니다.** 작업할 때마다 브랜치를 새로 만듭니다.

```
타입/작업-내용
```

예시: `feat/image-upload`, `style/home-page`, `fix/tts-double-play`

## 3. 작업 순서 (매번 이 순서대로)

```bash
# 1) main을 최신으로 맞추기
git checkout main
git pull origin main

# 2) 내 작업 브랜치 만들기
git checkout -b feat/image-upload

# 3) 작업 후 저장(커밋)
git add .
git commit -m "feat: 이미지 업로드 기능 추가"

# 4) GitHub에 올리기
git push origin feat/image-upload
```

5) GitHub 저장소 페이지에서 **Compare & pull request** 버튼을 눌러 Pull Request(PR)를 만듭니다.
6) 팀원 1명 이상이 확인하고 **Merge**합니다.
7) 머지 후에는 다시 1)부터 시작합니다.

## 4. 파일 담당 범위

같은 파일을 동시에 고치면 충돌이 나기 쉽습니다.

- `css/common.css`, HTML 공통 구조(헤더·푸터): **Oh Jiwoo**가 관리합니다. 바꾸고 싶은 점이 있으면 먼저 말해 주세요.
- 기능 담당자는 `js/` 아래 **자기 기능 파일**을 만들어 작업합니다. 예: `js/image-convert.js`
- 다른 사람이 담당하는 파일을 고쳐야 하면 단톡방에 먼저 알립니다.

## 5. 자주 하는 실수

| 상황 | 해결 |
|---|---|
| `git push`가 거절됨 (`rejected`) | `git pull origin 내브랜치` 후 다시 푸시 |
| main에서 작업해 버림 | 커밋 전이라면 `git checkout -b 새브랜치`로 옮긴 뒤 커밋 |
| 충돌(conflict) 발생 | 혼자 해결하기 어려우면 그대로 두고 단톡방에 공유 |
| 커밋 메시지 오타 (푸시 전) | `git commit --amend -m "새 메시지"` |
