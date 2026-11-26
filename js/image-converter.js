/*
 * Readly - Machado 2010 Color Contrast Enhancement
 * JavaScript Adaptation
 *
 * Source:
 * https://github.com/DrosteEffect/ColorVisionDeficiency
 *
 * Code and Implementation:
 * Copyright (c) 2026 Stephen Cobeldick
 *
 * Algorithm:
 * Gustavo M. Machado and Manuel M. Oliveira (2010)
 * https://doi.org/10.1111/j.1467-8659.2009.01586.x
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any
 * person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice
 * shall be included in all copies or substantial portions
 * of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
 * ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 * Modified for browser-based still image processing.
 * Not an exact numerical port of the original implementation.
 */

// 색각 유형별 색상 평면 각도
const ANGLES = {
    protan: -11.48,
    deutan: -8.11,
    tritan: 46.37
};

// 색각 유형별 보정 강도
const STRENGTH = {
    protan: 0.8,
    deutan: 0.8,
    tritan: 0.8
};

// 이미지 분석에 사용할 최대 표본 수
const MAX_SAMPLES = 120000;

// CIE Lab 변환 상수
const EPS = 216 / 24389;
const K = 24389 / 27;

// 값의 범위 제한
function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
}

// sRGB를 Linear RGB로 변환하는 테이블
const linear = Array.from({length: 256}, (_, i) => {
    const v = i / 255;

    return v <= 0.04045
        ? v / 12.92
        : ((v + 0.055) / 1.055) ** 2.4;
});

// CIE Lab 변환 함수
function labF(v){
    return v > EPS
        ? Math.cbrt(v)
        : (K * v + 16) / 116;
}

// CIE Lab 역변환 함수
function labInv(v){
    return v ** 3 > EPS
        ? v ** 3
        : (116 * v - 16) / K;
}

// RGB를 CIE Lab 색상 공간으로 변환
function rgbToLab(r, g, b){

    r = linear[r];
    g = linear[g];
    b = linear[b];

    const x = labF(
        (0.4124564 * r +
         0.3575761 * g +
         0.1804375 * b) / 0.95047
    );

    const y = labF(
        0.2126729 * r +
        0.7151522 * g +
        0.0721750 * b
    );

    const z = labF(
        (0.0193339 * r +
         0.1191920 * g +
         0.9503041 * b) / 1.08883
    );

    return [
        116 * y - 16,
        500 * (x - y),
        200 * (y - z)
    ];
}

// CIE Lab을 Linear RGB로 변환
function labToLinear(L, a, b){

    const y0 = (L + 16) / 116;

    const x = 0.95047 * labInv(y0 + a / 500);
    const y = labInv(y0);
    const z = 1.08883 * labInv(y0 - b / 200);

    return [
        3.2404542 * x -
        1.5371385 * y -
        0.4985314 * z,

        -0.9692660 * x +
        1.8760108 * y +
        0.0415560 * z,

        0.0556434 * x -
        0.2040259 * y +
        1.0572252 * z
    ];
}

// Linear RGB를 sRGB로 변환
function encode(v){

    v = clamp(v, 0, 1);

    return 255 * (
        v <= 0.0031308
            ? 12.92 * v
            : 1.055 * v ** (1 / 2.4) - 0.055
    );
}

// RGB가 표현 가능한 색역에 포함되는지 확인
function inGamut(rgb){

    return rgb.every(
        v => v >= -0.000001 && v <= 1.000001
    );
}

// 밝기를 유지하면서 색역을 벗어난 색상 조정
function gamutMap(L, a, b){

    let rgb = labToLinear(L, a, b);

    if(!inGamut(rgb)){

        let lo = 0;
        let hi = 1;

        // 이진 탐색으로 표현 가능한 채도 계산
        for(let k = 0; k < 12; k++){

            const mid = (lo + hi) / 2;

            if(inGamut(labToLinear(L, a * mid, b * mid))){
                lo = mid;
            }
            else{
                hi = mid;
            }
        }

        rgb = labToLinear(L, a * lo, b * lo);
    }

    return rgb.map(encode);
}

// 동일한 이미지에서 동일한 표본을 선택하기 위한 난수 생성
function makeRandom(){

    let seed = 123456789;

    return () => {

        seed = (
            Math.imul(1664525, seed) + 1013904223
        ) >>> 0;

        return (seed + 0.5) / 4294967296;
    };
}

// 주변 픽셀을 분석하여 색상 보정 방향 추정
function estimateDirection(pixels, width, height, da, db){

    const random = makeRandom();

    const n = width * height;
    const samples = Math.min(n, MAX_SAMPLES);

    const sigma = Math.max(
        1,
        Math.sqrt(
            (2 / Math.PI) *
            Math.sqrt(2 * Math.min(width, height))
        )
    );

    let aa = 0;
    let ab = 0;
    let bb = 0;

    // 이미지 내 주변 픽셀의 색상 차이 분석
    for(let s = 0; s < samples; s++){

        const p = samples === n
            ? s
            : Math.floor((s + random()) * n / samples);

        const x = p % width;
        const y = Math.floor(p / width);

        // 주변 픽셀 선택
        const radius = Math.sqrt(-2 * Math.log(random()));
        const angle = 2 * Math.PI * random();

        const nx = clamp(
            Math.round(x + sigma * radius * Math.cos(angle)),
            0,
            width - 1
        );

        const ny = clamp(
            Math.round(y + sigma * radius * Math.sin(angle)),
            0,
            height - 1
        );

        const i = p * 4;
        const j = (ny * width + nx) * 4;

        // 같은 픽셀 또는 완전히 투명한 픽셀은 제외
        if(i === j || !pixels[i + 3] || !pixels[j + 3]){
            continue;
        }

        // 두 픽셀을 Lab 색상 공간으로 변환
        const c1 = rgbToLab(
            pixels[i],
            pixels[i + 1],
            pixels[i + 2]
        );

        const c2 = rgbToLab(
            pixels[j],
            pixels[j + 1],
            pixels[j + 2]
        );

        // 두 픽셀의 색상 차이
        const dL = c1[0] - c2[0];
        const a = c1[1] - c2[1];
        const b = c1[2] - c2[2];

        const distance = Math.hypot(dL, a, b);

        if(distance < 0.00000001){
            continue;
        }

        // 색각 이상 사용자가 인식할 수 있는 색상 차이 근사
        const perceived = Math.hypot(
            dL,
            a * da + b * db
        );

        // 손실되는 색상 대비 계산
        const loss = Math.max(
            0,
            1 - perceived / distance
        );

        const weight = loss *
            Math.min(pixels[i + 3], pixels[j + 3]) / 255;

        const u = a * weight;
        const v = b * weight;

        aa += u * u;
        ab += u * v;
        bb += v * v;
    }

    // 보정할 색상 대비가 없는 경우
    if(aa + bb < 0.00000001){
        return null;
    }

    // 2x2 대칭 행렬의 최대 고유벡터 계산
    const theta = 0.5 * Math.atan2(
        2 * ab,
        aa - bb
    );

    let a = Math.cos(theta);
    let b = Math.sin(theta);

    // 과도한 색상 반전 방지
    if(a * da + b * db < 0){
        a = -a;
        b = -b;
    }

    return [a, b];
}

// 이미지 전체 색상 보정
export function convertImage(imageData, colorType){

    // 색각 유형 확인
    if(!Object.hasOwn(ANGLES, colorType)){
        throw new Error('지원하지 않는 색각 유형입니다.');
    }

    const {width, height, data} = imageData;

    // 원본 이미지 데이터 복사
    const result = new ImageData(
        new Uint8ClampedArray(data),
        width,
        height
    );

    // 선택된 색각 유형에 따른 색상 평면 계산
    const angle = ANGLES[colorType] * Math.PI / 180;

    const da = Math.sin(angle);
    const db = Math.cos(angle);

    // 이미지 특성에 따른 보정 방향 분석
    const direction = estimateDirection(
        data,
        width,
        height,
        da,
        db
    );

    const strength = STRENGTH[colorType];

    // 보정이 필요하지 않으면 원본 반환
    if(!direction || strength === 0){
        return result;
    }

    // 같은 색상의 반복 계산을 줄이기 위한 캐시
    const cache = new Map();

    // 모든 픽셀의 색상 보정
    for(let i = 0; i < data.length; i += 4){

        // 완전히 투명한 픽셀 제외
        if(!data[i + 3]){
            continue;
        }

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 흑백 및 회색 픽셀은 원본 유지
        if(r === g && g === b){
            continue;
        }

        // RGB 색상을 캐시 키로 변환
        const key = (r << 16) | (g << 8) | b;

        let rgb = cache.get(key);

        // 이전에 계산하지 않은 색상만 보정
        if(!rgb){

            const [L, a, b0] = rgbToLab(r, g, b);

            // 이미지별 보정 방향으로 색상 투영
            const projection =
                a * direction[0] +
                b0 * direction[1];

            const targetA = projection * da;
            const targetB = projection * db;

            // 원본 색상과 보정 색상 혼합
            const newA = a + (targetA - a) * strength;
            const newB = b0 + (targetB - b0) * strength;

            // 밝기를 유지하면서 RGB 색상으로 변환
            rgb = gamutMap(L, newA, newB);

            // 캐시의 최대 크기 제한
            if(cache.size < 65536){
                cache.set(key, rgb);
            }
        }

        // 보정된 RGB 값 적용
        result.data[i] = rgb[0];
        result.data[i + 1] = rgb[1];
        result.data[i + 2] = rgb[2];

        // 투명도(Alpha)는 변경하지 않음
    }

    return result;
}