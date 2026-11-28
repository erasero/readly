
(() => {
    const sentenceInput = document.getElementById("sentence");
    const suggestionsList = document.getElementById("suggestionsList");
    const suggestionsEmpty = document.getElementById("suggestionsEmpty");
    const suggestionsTitle = document.getElementById("sugg-title");

    const confirmSentenceBtn =
        document.getElementById("confirmSentenceBtn");

    const sentenceHighlight =
        document.getElementById("sentenceHighlight");

    const API_URL = "http://localhost:3000/api/spellcheck";

    let suggestions = [];
    let lastCheckedText = "";

    let debounceTimer = null;
    let requestSequence = 0;


    // ------------------------------
    // 교정 제안 초기화
    // ------------------------------

    function clearSuggestions() {
        suggestions = [];
        lastCheckedText = "";

        renderSuggestions();
        renderHighlight(sentenceHighlight, sentenceInput.value);

        updateResultCount();
    }


    // ------------------------------
    // 교정 제안 개수 갱신
    // ------------------------------

    function updateResultCount() {
        if (window.ReadlyWriting) {
            window.ReadlyWriting.updateResultCount();
        }
    }

    function getSuggestionCount() {
        return suggestions.length;
    }


    // ------------------------------
    // 교정 제안 화면 표시
    // ------------------------------

    function renderSuggestions() {
        suggestionsList.replaceChildren();

        suggestionsTitle.textContent =
            `교정 제안 - ${suggestions.length}개`;

        suggestionsEmpty.hidden = suggestions.length > 0;

        if (suggestions.length === 0) {
            suggestionsEmpty.textContent =
                "현재 문장의 교정 제안이 여기에 표시됩니다.";
        }

    

        suggestions.forEach((suggestion, index) => {
            const li = document.createElement("li");
            li.className = "suggestions__item";

            if (suggestion.ignored) {
                li.classList.add("is-ignored");
            }

            const content = document.createElement("div");
            content.className = "suggestions__content";

            const change = document.createElement("p");
            change.className = "suggestions__change";

            const origin = document.createElement("span");

            origin.className =
                suggestion.category === "SPACING"
                    ? "suggestions__origin suggestions__origin--spacing"
                    : "suggestions__origin suggestions__origin--spell";

            origin.textContent = suggestion.origin;
            const arrow = document.createElement("span");
            arrow.className = "suggestions__arrow";
            arrow.textContent = " → ";

            const revised = document.createElement("span");

            revised.className =
                suggestion.category === "SPACING"
                    ? "suggestions__revised suggestions__revised--spacing"
                    : "suggestions__revised suggestions__revised--spell";

                revised.textContent = suggestion.revised;

            change.append(origin, arrow, revised);
            content.appendChild(change);

            if (suggestion.comment) {
                const reason = document.createElement("p");
                reason.className = "suggestions__reason";
                reason.textContent = suggestion.comment;

                content.appendChild(reason);
            }

            const ignoreButton = document.createElement("button");
            ignoreButton.type = "button";
            ignoreButton.className =
                "btn btn--outline-blue btn--sm suggestions__ignore";
            ignoreButton.textContent = "무시";
            ignoreButton.textContent =
                suggestion.ignored ? "무시 취소" : "무시";

            ignoreButton.addEventListener("click", () => {
                suggestions[index].ignored = !suggestions[index].ignored;

                renderSuggestions();
                renderHighlight(sentenceHighlight, sentenceInput.value);

                updateResultCount();
            });

            li.append(content, ignoreButton);
            suggestionsList.appendChild(li);
        });

        updateResultCount();
    }



    confirmSentenceBtn.addEventListener("click", () => {
    if (window.ReadlyWriting) {
        window.ReadlyWriting.confirmSentence();
    }
});


    // ------------------------------
    // Bareun API 요청
    // ------------------------------

    async function requestSpellcheck(text, currentSequence) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                throw new Error(
                    `맞춤법 검사 요청 실패: ${response.status}`
                );
            }

            const data = await response.json();

            if (currentSequence !== requestSequence) {
                return;
            }

            if (sentenceInput.value !== text) {
                return;
            }

            lastCheckedText = text;
            suggestions = parseSuggestions(data);

            renderSuggestions();
            renderHighlight(sentenceHighlight, text);

        } catch (error) {
            if (currentSequence !== requestSequence) {
                return;
            }

            console.error("맞춤법 검사 오류:", error);

            suggestions = [];
            lastCheckedText = "";

            renderSuggestions();

            suggestionsEmpty.hidden = false;
            suggestionsEmpty.textContent =
                "맞춤법 검사에 실패했습니다. 잠시 후 다시 시도해 주세요.";

            renderHighlight(sentenceHighlight, text);
        }
    }


    // ------------------------------
    // Bareun 응답에서 교정 항목 추출
    // ------------------------------

    function parseSuggestions(data) {
        if (!Array.isArray(data.revisedBlocks)) {
            return [];
        }

        const blocks = data.revisedBlocks
            .map(block => {
                const origin = block.origin;

                if (
                    !origin ||
                    typeof origin.content !== "string" ||
                    typeof origin.beginOffset !== "number" ||
                    typeof origin.length !== "number" ||
                    typeof block.revised !== "string"
                ) {
                    return null;
                }

                const revision = Array.isArray(block.revisions)
                    ? block.revisions[0]
                    : null;

                const helpId = revision?.helpId;
                const help = helpId ? data.helps?.[helpId] : null;

                return {
                    origin: origin.content,
                    revised: block.revised,
                    beginOffset: origin.beginOffset,
                    length: origin.length,
                    category: revision?.category || block.category || "",
                    comment: help?.comment || "",
                    ignored: false
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.beginOffset - b.beginOffset);

        const result = [];
        let previousEnd = -1;

        blocks.forEach(block => {
            const start = block.beginOffset;
            const end = start + block.length;

            if (start < previousEnd) {
                return;
            }

            result.push(block);
            previousEnd = end;
        });

        return result;
    }


    // ------------------------------
    // 입력 후 1초 뒤 자동 검사
    // ------------------------------

    sentenceInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);

        requestSequence++;

        const currentSequence = requestSequence;
        const text = sentenceInput.value;

        clearSuggestions();

        if (text.trim() === "") {
            return;
        }

        suggestionsEmpty.hidden = false;
        suggestionsEmpty.textContent = "교정 중입니다.";

        debounceTimer = setTimeout(() => {
            requestSpellcheck(text, currentSequence);
        }, 1000);
    });


    // ------------------------------
    // 교정 대상 하이라이트 표시
    // ------------------------------

    function renderHighlight(container, text) {
        if (!container) {
            return;
        }

        container.replaceChildren();

        if (text !== lastCheckedText || suggestions.length === 0) {
            container.textContent = text;
            return;
        }

        const activeSuggestions = suggestions
            .filter(item => !item.ignored)
            .sort((a, b) => a.beginOffset - b.beginOffset);

        let cursor = 0;

        activeSuggestions.forEach(suggestion => {
            const start = suggestion.beginOffset;
            const end = start + suggestion.length;

            if (
                start < cursor ||
                start < 0 ||
                end > text.length
            ) {
                return;
            }

            container.appendChild(
                document.createTextNode(text.slice(cursor, start))
            );

            const mark = document.createElement("mark");
            mark.classList.add("err");

            if (suggestion.category === "SPACING") {
                mark.classList.add("err--space");
            } else {
                mark.classList.add("err--spell");
            }

            mark.textContent = text.slice(start, end);
            container.appendChild(mark);

            cursor = end;
        });

        container.appendChild(
            document.createTextNode(text.slice(cursor))
        );
    }


    // ------------------------------
    // Enter를 누를 때 적용할 교정문 생성
    // ------------------------------

    function applyAccepted(text) {
        if (text !== lastCheckedText) {
            return text;
        }

        const accepted = suggestions
            .filter(item => !item.ignored)
            .sort((a, b) => b.beginOffset - a.beginOffset);

        let revisedText = text;

        accepted.forEach(suggestion => {
            const start = suggestion.beginOffset;
            const end = start + suggestion.length;

            if (
                revisedText.slice(start, end) !== suggestion.origin
            ) {
                return;
            }

            revisedText =
                revisedText.slice(0, start) +
                suggestion.revised +
                revisedText.slice(end);
        });

        return revisedText;
    }


    // ------------------------------
    // writing.js에서 사용할 기능 공개
    // ------------------------------

    window.ReadlySpellcheck = {
        renderHighlight,
        applyAccepted,
        getSuggestionCount
    };


    // 최초 화면 하이라이트 갱신
    renderHighlight(sentenceHighlight, sentenceInput.value);

})();
