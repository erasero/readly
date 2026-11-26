const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const spellcheckRouter = require("./spellcheck");

// 프로젝트 최상위 폴더의 .env 읽기
dotenv.config({
    path: path.join(__dirname, "../.env")
});

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 맞춤법 검사 API 연결
app.use("/api/spellcheck", spellcheckRouter);

// 서버 실행
app.listen(PORT, () => {
    console.log(`Readly 서버 실행 중: http://localhost:${PORT}`);
});
