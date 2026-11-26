import {loadColorMedia} from './color-storage.js';
import {convertImage} from './image-converter.js';

// 색각 유형 이름
const COLOR_TYPES = {
    protan: '적색 계열 (Protan)',
    deutan: '녹색 계열 (Deutan)',
    tritan: '청색 계열 (Tritan)'
};

// 최대 이미지 해상도
const MAX_PIXELS = 16000000;

// HTML 요소 가져오기
const originalCanvas =
    document.querySelector('#original-canvas');

const resultCanvas =
    document.querySelector('#result-canvas');

const appliedType =
    document.querySelector('#applied-type');

const downloadBtn =
    document.querySelector('#download-btn');

const status =
    document.querySelector('#result-status');

// Canvas Context 가져오기
const originalCtx =
    originalCanvas.getContext('2d');

const resultCtx =
    resultCanvas.getContext('2d');

// 다운로드에 사용할 파일명
let downloadName = '';

// 이미지 파일 불러오기
function loadImage(file) {
    return new Promise((resolve, reject) => {

        const image = new Image();
        const url = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('이미지를 불러올 수 없습니다.'));
        };

        image.src = url;
    });
}

// 이미지 변환 실행
async function initImageResult() {

    downloadBtn.disabled = true;

    try {
        status.textContent = '이미지를 불러오는 중입니다.';

        // IndexedDB에서 파일과 색각 유형 가져오기
        const savedData = await loadColorMedia();

        // 저장된 파일 확인
        if (!savedData || !savedData.file) {
            throw new Error('저장된 이미지가 없습니다.');
        }

        const {file, colorType} = savedData;

        // 적용된 색각 유형 표시
        appliedType.textContent = COLOR_TYPES[colorType];

        // 이미지 불러오기
        const image = await loadImage(file);

        // 이미지 크기 확인
        const width = image.naturalWidth;
        const height = image.naturalHeight;

        if (width * height > MAX_PIXELS) {
            throw new Error('이미지 해상도가 너무 높습니다.');
        }

        // 원본 이미지 Canvas 크기 설정
        originalCanvas.width = width;
        originalCanvas.height = height;

        // 결과 이미지 Canvas 크기 설정
        resultCanvas.width = width;
        resultCanvas.height = height;

        // 원본 이미지 출력
        originalCtx.drawImage(image, 0, 0);

        status.textContent = '색상을 보정하는 중입니다.';

        // 화면에 상태 메시지가 표시될 수 있도록 대기
        await new Promise(resolve =>
            requestAnimationFrame(() =>
                requestAnimationFrame(resolve)
            )
        );

        // 원본 이미지의 픽셀 데이터 가져오기
        const originalData = originalCtx.getImageData(
            0,
            0,
            width,
            height
        );

        // 색상 보정 실행
        const convertedData = convertImage(
            originalData,
            colorType
        );

        // 변환 결과 출력
        resultCtx.putImageData(convertedData, 0, 0);

        // 원본 파일명에서 확장자 제거
        const originalName = file.name.replace(/\.[^.]+$/, '');

        // 다운로드 파일명 생성
        downloadName = `${originalName}-readly-converted.png`;

        // 변환 완료
        status.textContent = '이미지 변환이 완료되었습니다.';

        downloadBtn.disabled = false;

    } catch (error) {

        console.error(error);

        status.textContent = error.message;

        downloadBtn.disabled = true;
    }
}

// 변환된 이미지 다운로드
downloadBtn.addEventListener('click', () => {

    resultCanvas.toBlob((blob) => {

        if (!blob) {
            alert('이미지를 다운로드할 수 없습니다.');
            return;
        }

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;
        link.download = downloadName;

        document.body.appendChild(link);

        link.click();
        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

    }, 'image/png');
});

// 결과 페이지 진입 시 이미지 변환 시작
initImageResult();