import {daltonize} from 'https://cdn.jsdelivr.net/npm/daltonize@1.0.2/+esm';

// Open Source: Daltonize
// https://github.com/benpoulson/daltonize

// 색각 유형을 Daltonize에서 사용하는 유형으로 변환
const COLOR_TYPES = {
    protan: 'protanope',
    deutan: 'deuteranope',
    tritan: 'tritanope'
};

// RGB 값의 범위를 0~255로 제한
function clamp(value){
    return Math.max(0, Math.min(255, value));
}

// 이미지 전체 색상 보정
export function convertImage(imageData, colorType){

    // 색각 유형 확인
    if(!Object.hasOwn(COLOR_TYPES, colorType)){
        throw new Error('지원하지 않는 색각 유형입니다.');
    }

    // Daltonize에 전달할 색각 유형
    const type = COLOR_TYPES[colorType];

    // 원본 이미지 데이터 복사
    const result = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );

    const pixels = result.data;

    // 모든 픽셀의 색상 보정
    for(let i = 0; i < pixels.length; i += 4){

        // 원본 RGB 값
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Daltonize 오픈소스 라이브러리로 색상 보정
        const [newR, newG, newB] =
            daltonize([r, g, b], type);

        // 보정된 RGB 값 적용
        pixels[i] = clamp(newR);
        pixels[i + 1] = clamp(newG);
        pixels[i + 2] = clamp(newB);

        // 투명도(Alpha)는 변경하지 않음
    }

    return result;
}