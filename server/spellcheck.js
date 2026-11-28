
const express = require("express");

const router = express.Router();

const BAREUN_API_URL =
    "https://api.bareun.ai/bareun.RevisionService/CorrectError";

// 맞춤법 검사 요청
router.post("/", async (req, res) => {
    try {
        const { text } = req.body;

        if (typeof text !== "string" || text.trim() === "") {
            return res.status(400).json({
                error: "검사할 문장을 입력해 주세요."
            });
        }

        const apiKey = process.env.BAREUN_API_KEY;

        if (!apiKey) {
            console.error("Bareun API 키가 설정되지 않았습니다.");

            return res.status(500).json({
                error: "서버의 API 키 설정을 확인해 주세요."
            });
        }

        const response = await fetch(BAREUN_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": apiKey
            },
            body: JSON.stringify({
                document: {
                    content: text,
                    language: "ko-KR"
                },
                encoding_type: "UTF16",
                config: {
                    enable_sentence_check: true,
                    disable_typo_correction: false,
                    disable_confusion: false
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Bareun API 오류:", result);

            return res.status(response.status).json({
                error: "맞춤법 검사 API 요청에 실패했습니다."
            });
        }

        res.json(result);

    } catch (error) {
        console.error("맞춤법 검사 서버 오류:", error);

        res.status(500).json({
            error: "맞춤법 검사 중 서버 오류가 발생했습니다."
        });
    }
});

module.exports = router;
