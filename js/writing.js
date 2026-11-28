const sentenceInput = document.getElementById("sentence");
const sentenceCount = document.getElementById("sentenceCount");
const resultList = document.getElementById("resultList");
const editorCount = document.getElementById("editorCount");
const sentenceLabel = document.getElementById("sentenceLabel");
const sentenceHighlight = document.getElementById("sentenceHighlight");
const copyResultBtn = document.getElementById("copyResultBtn");

const letterSpacingRange = document.getElementById("letterSpacing");
const lineHeightRange = document.getElementById("lineHeight");

const voiceInputBtn = document.getElementById("voiceInputBtn");
const sentenceHintText = document.getElementById("sentenceHintText");

const sentenceBox = document.querySelector(".sentence-input__box");
const sentences = [];
let editingId = null;
let nextId = 1;

function updateTextSpacing() {

    // 슬라이더 값 가져오기 (0~10)
    const letterValue = Number(letterSpacingRange.value);
    const lineValue = Number(lineHeightRange.value);

    // 자간: 0.5px ~ 2px
    const letterSpacing = 0.5 + letterValue * 0.25;

    // 행간: 1.3 ~ 1.9
    const lineHeight = 1.3 + lineValue * 0.06;

    // 입력란에 CSS 변수 적용
    sentenceBox.style.setProperty(
        "--input-letter-spacing",
        `${letterSpacing}px`
    );

    sentenceBox.style.setProperty(
        "--input-line-height",
        lineHeight.toFixed(2)
    );
}

// 슬라이더를 움직일 때마다 즉시 반영
letterSpacingRange.addEventListener("input", updateTextSpacing);
lineHeightRange.addEventListener("input", updateTextSpacing);

// 페이지 최초 로딩 시 기본값 적용
updateTextSpacing();

// 글자수 카운트
function updateCharCount() {
    const length = sentenceInput.value.length;
    sentenceCount.textContent = `${length} / 200자`;
}

function updateSentenceHighlight() {
    sentenceHighlight.textContent = sentenceInput.value;
    // 스크롤 위치도 동기화
    sentenceHighlight.scrollTop = sentenceInput.scrollTop;
}

function updateSentenceLabel() {
    if (editingId !== null) {
        const index = sentences.findIndex(
            sentence => sentence.id === editingId
        );

        sentenceLabel.textContent = `문장 ${index + 1} 수정`;
    } else {
        sentenceLabel.textContent = `문장 ${sentences.length + 1}`;
    }
}
function renderSentences() {
    // 기존 결과 화면 비우기
    resultList.replaceChildren();

    const resultEmpty = document.getElementById("resultEmpty");
    // 확정된 문장이 하나라도 있으면 안내 문구 숨기기
    resultEmpty.hidden = sentences.length > 0;

    // 저장된 문장들을 순서대로 화면에 표시
    sentences.forEach((sentence, index) => {
        const li = document.createElement("li");

        // 문장을 클릭할 수 있는 버튼으로 생성
        const button = document.createElement("button");
        button.type = "button";
        button.className = "result__sentence";

        // 현재 수정 중인 문장 표시
        if (sentence.id === editingId) {
            button.classList.add("is-editing");
        }

        // 문장 번호
        const number = document.createElement("sup");
        number.textContent = index + 1;

        // 문장 내용
        button.appendChild(number);
        button.appendChild(document.createTextNode(sentence.text));

        // 문장 클릭 시 입력란으로 불러오기
        button.addEventListener("click", () => {
            loadSentence(sentence.id);
        });

        li.appendChild(button);

        // 문장 사이에 공백 추가
        li.appendChild(document.createTextNode(" "));

        resultList.appendChild(li);
    });

    updateSentenceLabel();
}

function loadSentence(id) {
    const sentence = sentences.find(
        sentence => sentence.id === id
    );

    if (!sentence) {
        return;
    }

    // 수정할 문장의 ID 저장
    editingId = id;

    // 기존 문장을 입력란에 표시
    sentenceInput.value = sentence.text;

    updateCharCount();
    updateSentenceHighlight();
    updateSentenceLabel();
    renderSentences();

    // 입력란에 커서 이동
    sentenceInput.focus();

    // 안내 문구 변경
    sentenceHintText.textContent =
        "문장을 수정한 뒤 Enter를 누르면 기존 문장이 교체돼요.";
}

function confirmSentence() {
    const text = sentenceInput.value.trim();

    // 빈 문장은 확정하지 않음
    if (text === "") {
        return;
    }

    if (editingId !== null) {
        // 기존 문장 수정
        const sentence = sentences.find(
            sentence => sentence.id === editingId
        );

        if (sentence) {
            sentence.text = text;
        }

        // 수정 상태 종료
        editingId = null;

    } else {
        // 새로운 문장 추가
        const sentence = {
            id: nextId++,
            text: text
        };

        sentences.push(sentence);
    }

    // 입력란 초기화
    sentenceInput.value = "";

    // 결과 화면 갱신
    renderSentences();

    // 글자 수 갱신
    updateCharCount();
    updateSentenceHighlight();

    // 안내 문구 초기화
    sentenceHintText.textContent =
        "Enter를 누르면 문장이 작성 결과에 추가돼요.";
}


// 결과란 문장, 글자 수 계산
function updateResultCount() {

    // 전체 문장의 글자 수 계산
    let totalLength = 0;
    for (let i = 0; i < sentences.length; i++) {
        totalLength += sentences[i].text.length;
    }

    editorCount.textContent =
        `${sentences.length}문장 · ${totalLength}자 · 교정 제안 0개`;

    // 다음 입력할 문장 번호
    sentenceLabel.textContent = `문장 ${sentences.length + 1}`;
}

// 입력할 때 글자 수와 하이라이트 영역 갱신
sentenceInput.addEventListener("input", () => {
    updateCharCount();
    updateSentenceHighlight();
});

// 스크롤 위치 동기화
sentenceInput.addEventListener("scroll", updateSentenceHighlight);

sentenceInput.addEventListener("keydown", function(event) {

    // 한글 조합 중에는 Enter를 가로채지 않음
    if (event.isComposing || event.keyCode === 229) {
        return;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        confirmSentence();
    }
});

// 작성 결과 복사하기
copyResultBtn.addEventListener("click", async () => {

    // 저장된 모든 문장을 하나의 문자열로 합치기
    const resultText = sentences
        .map(sentence => sentence.text)
        .join(" ");

    // 복사할 문장이 없는 경우
    if (resultText === "") {
        alert("복사할 문장이 없습니다.");
        return;
    }

    try {
        // 클립보드에 텍스트 복사
        await navigator.clipboard.writeText(resultText);

        alert("작성 결과가 복사되었습니다.");

    } catch (error) {
        console.error("텍스트 복사 실패:", error);
        alert("텍스트 복사에 실패했습니다. 다시 시도해 주세요.");
    }
});

const readResultBtn = document.getElementById("readResultBtn");

let isReading = false;

function resetReadButton() {
    isReading = false;
    readResultBtn.textContent = "결과 읽어주기";
}

readResultBtn.addEventListener("click", () => {
    // 브라우저의 음성 합성 기능 지원 여부 확인
    if (!("speechSynthesis" in window)) {
        alert("이 브라우저에서는 음성 읽기를 지원하지 않습니다.");
        return;
    }

    // 읽는 도중 다시 누르면 읽기 중지
    if (isReading) {
        window.speechSynthesis.cancel();
        resetReadButton();
        return;
    }

    // 확정된 문장이 없는 경우
    const resultText = sentences.map(sentence => sentence.text).join(" ");

    if (resultText.trim() === "") {
        alert("읽어줄 문장이 없습니다.");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(resultText);

    utterance.lang = "ko-KR";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onend = resetReadButton;
    utterance.onerror = resetReadButton;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    isReading = true;
    readResultBtn.textContent = "읽기 중지";
});

updateCharCount();
updateSentenceLabel();
renderSentences();

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isRecording = false;

// 브라우저의 음성 인식 기능 지원 여부 확인
if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    // 한국어 음성 인식
    recognition.lang = "ko-KR";

    // 한 문장만 인식하고 끝내지 않고 계속 인식
    recognition.continuous = true;

    // 최종 인식 결과만 입력란에 반영
    recognition.interimResults = false;

    // 음성 입력 버튼 클릭
    voiceInputBtn.addEventListener("click", () => {

        // 이미 음성 입력 중이면 종료
        if (isRecording) {
            recognition.stop();
            return;
        }

        try {
            recognition.start();
        } catch (error) {
            console.error("음성 인식 시작 실패:", error);
        }
    });

    // 음성 인식 시작
    recognition.onstart = () => {
        isRecording = true;

        voiceInputBtn.setAttribute("aria-pressed", "true");
        voiceInputBtn.classList.add("is-recording");
    };

    // 음성 인식 결과
    recognition.onresult = (event) => {

        let transcript = "";

        // 새롭게 인식된 최종 결과만 가져오기
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript;
            }
        }

        if (transcript.trim() === "") {
            return;
        }

        // 기존 입력 내용이 있다면 공백을 두고 이어 붙이기
        const currentText = sentenceInput.value;

        const separator = currentText.length > 0 ? " " : "";

        const remainingLength = 200 - currentText.length;

        // 최대 글자 수 200자 제한
        const newText = (separator + transcript).slice(0, remainingLength);

        sentenceInput.value += newText;

        // 기존 input 이벤트 실행
        sentenceInput.dispatchEvent(new Event("input", {
            bubbles: true
        }));
    };

    // 음성 인식 종료
    recognition.onend = () => {
        isRecording = false;

        voiceInputBtn.setAttribute("aria-pressed", "false");
        voiceInputBtn.classList.remove("is-recording");
    };

    // 음성 인식 오류
    recognition.onerror = (event) => {
        console.error("음성 인식 오류:", event.error);

        if (event.error === "not-allowed" ||
            event.error === "service-not-allowed") {
            alert("마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해 주세요.");
        } else if (event.error === "no-speech") {
            // 음성이 감지되지 않은 경우 별도 안내 없이 종료
            return;
        } else if (event.error === "audio-capture") {
            alert("마이크를 찾을 수 없습니다. 마이크 연결을 확인해 주세요.");
        } else {
            alert("음성 입력 중 오류가 발생했습니다.");
        }
    };

} else {
    // 브라우저가 음성 인식을 지원하지 않는 경우
    voiceInputBtn.addEventListener("click", () => {
        alert("현재 브라우저에서는 음성 입력을 지원하지 않습니다. Chrome 또는 Edge를 이용해 주세요.");
    });
}
