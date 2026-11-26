// 색각 유형별 시뮬레이션 행렬
const COLOR_MATRICES = {
    protan: [
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998]
    ],

    deutan: [
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.011820, 0.042940, 0.968881]
    ],

    tritan: [
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.303900]
    ]
};

// 색상 보정 강도
const STRENGTH = 0.8;

// RGB 값의 범위를 0~1로 제한
function clamp(value){
    return Math.max(0, Math.min(1, value));
}

// sRGB를 Linear RGB로 변환
function toLinear(value){
    value = value / 255;

    if(value <= 0.04045){
        return value / 12.92;
    }

    return Math.pow((value + 0.055) / 1.055, 2.4);
}

// Linear RGB를 sRGB로 변환
function toSRGB(value){
    value = clamp(value);

    if(value <= 0.0031308){
        return Math.round(value * 12.92 * 255);
    }

    return Math.round(
        (1.055 * Math.pow(value, 1 / 2.4) - 0.055) * 255
    );
}

// 픽셀 하나의 색상 보정
function correctPixel(r, g, b, colorType){
    const matrix = COLOR_MATRICES[colorType];

    // Linear RGB로 변환
    r = toLinear(r);
    g = toLinear(g);
    b = toLinear(b);

    // 색각 유형에 따른 시뮬레이션 색상 계산
    const simR =
        matrix[0][0] * r +
        matrix[0][1] * g +
        matrix[0][2] * b;

    const simG =
        matrix[1][0] * r +
        matrix[1][1] * g +
        matrix[1][2] * b;

    const simB =
        matrix[2][0] * r +
        matrix[2][1] * g +
        matrix[2][2] * b;

    // 원본과 시뮬레이션 색상의 차이 계산
    const errorR = r - simR;
    const errorG = g - simG;
    const errorB = b - simB;

    let newR = r;
    let newG = g;
    let newB = b;

    // 색각 유형별 색상 보정
    switch(colorType){
        case 'protan':
            newG += STRENGTH * errorR * 0.7;
            newB += STRENGTH * errorR;
            break;

        case 'deutan':
            newR += STRENGTH * errorG * 0.7;
            newB += STRENGTH * errorG;
            break;

        case 'tritan':
            newR += STRENGTH * errorB;
            newG += STRENGTH * errorB * 0.7;
            break;
    }

    return [
        toSRGB(newR),
        toSRGB(newG),
        toSRGB(newB)
    ];
}

// 이미지 전체 색상 보정
export function convertImage(imageData, colorType){

    // 색각 유형 확인
    if(!Object.hasOwn(COLOR_MATRICES, colorType)){
        throw new Error('지원하지 않는 색각 유형입니다.');
    }

    // 원본 이미지 데이터 복사
    const result = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );

    const pixels = result.data;

    // 모든 픽셀의 색상 보정
    for(let i = 0; i < pixels.length; i += 4){

        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        const [newR, newG, newB] =
            correctPixel(r, g, b, colorType);

        pixels[i] = newR;
        pixels[i + 1] = newG;
        pixels[i + 2] = newB;

        // 투명도(Alpha)는 유지
    }

    return result;
}