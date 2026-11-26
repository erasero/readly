
const MACHADO = {
    protan: [
        0.152286, 1.052583, -0.204868,
        0.114503, 0.786281, 0.099216,
        -0.003882, -0.048116, 1.051998
    ],
    deutan: [
        0.367322, 0.860646, -0.227968,
        0.280085, 0.672501, 0.047413,
        -0.011820, 0.042940, 0.968881
    ],
    tritan: [
        1.255528, -0.076749, -0.178779,
        -0.078411, 0.930809, 0.147602,
        0.004733, 0.691367, 0.303900
    ]
};

const REDISTRIBUTION = {
    protan: [
        0, 0, 0,
        0.7, 1, 0,
        0.7, 0, 1
    ],
    deutan: [
        1, 0.7, 0,
        0, 0, 0,
        0, 0.7, 1
    ],
    tritan: [
        1, 0, 0.7,
        0, 1, 0.7,
        0, 0, 0
    ]
};

const YR = 0.2126;
const YG = 0.7152;
const YB = 0.0722;
const YN = YR * YR + YG * YG + YB * YB;

const TO_LINEAR = new Float32Array(256);

for (let i = 0; i < 256; i++) {
    const v = i / 255;

    TO_LINEAR[i] = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function toSrgb(value) {
    value = Math.max(0, Math.min(1, value));

    return value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

function processPixel(r, g, b, matrix, correction, strength) {
    const sr = matrix[0] * r + matrix[1] * g + matrix[2] * b;
    const sg = matrix[3] * r + matrix[4] * g + matrix[5] * b;
    const sb = matrix[6] * r + matrix[7] * g + matrix[8] * b;

    const er = r - sr;
    const eg = g - sg;
    const eb = b - sb;

    let dr = correction[0] * er + correction[1] * eg + correction[2] * eb;
    let dg = correction[3] * er + correction[4] * eg + correction[5] * eb;
    let db = correction[6] * er + correction[7] * eg + correction[8] * eb;

    const magnitude2 = er * er + eg * eg + eb * eb;
    const threshold = 0.015 * 0.015;
    const maxError = 0.15 * 0.15;

    let t = Math.max(0, Math.min(1, (magnitude2 - threshold) / (maxError - threshold)));

    t = t * t * (3 - 2 * t);
    const amount = strength * t;

    dr *= amount;
    dg *= amount;
    db *= amount;

    const projection = (dr * YR + dg * YG + db * YB) / YN;

    dr -= projection * YR;
    dg -= projection * YG;
    db -= projection * YB;

    const nr = r + dr;
    const ng = g + dg;
    const nb = b + db;

    const y = nr * YR + ng * YG + nb * YB;
    const neutral = Math.max(0, Math.min(1, y));

    let scale = 1;

    let c = nr - y;
    if (c > 0) scale = Math.min(scale, (1 - neutral) / c);
    else if (c < 0) scale = Math.min(scale, neutral / -c);

    c = ng - y;
    if (c > 0) scale = Math.min(scale, (1 - neutral) / c);
    else if (c < 0) scale = Math.min(scale, neutral / -c);

    c = nb - y;
    if (c > 0) scale = Math.min(scale, (1 - neutral) / c);
    else if (c < 0) scale = Math.min(scale, neutral / -c);

    scale = Math.max(0, Math.min(1, scale));

    return [
        toSrgb(neutral + (nr - y) * scale),
        toSrgb(neutral + (ng - y) * scale),
        toSrgb(neutral + (nb - y) * scale)
    ];
}

export function daltonizeImageData(imageData, colorType = "all", options = {}) {
    const types = colorType === "all" ? ["protan", "deutan", "tritan"] : [colorType];
    const strength = options.strength ?? 0.7;

    for (const type of types) {
        if (!MACHADO[type]) {
            throw new Error("Invalid color type: " + type);
        }
    }

    const data = imageData.data;
    const source = new Uint8ClampedArray(data);

    const count = types.length;

    const matrices = types.map(type => MACHADO[type]);
    const corrections = types.map(type => REDISTRIBUTION[type]);

    for (let i = 0; i < data.length; i += 4) {
        const r = TO_LINEAR[source[i]];
        const g = TO_LINEAR[source[i + 1]];
        const b = TO_LINEAR[source[i + 2]];

        let outR = 0;
        let outG = 0;
        let outB = 0;

        for (let j = 0; j < count; j++) {
            const result = processPixel(r, g, b, matrices[j], corrections[j], strength);

            outR += result[0] / count;
            outG += result[1] / count;
            outB += result[2] / count;
        }

        data[i] = Math.round(outR * 255);
        data[i + 1] = Math.round(outG * 255);
        data[i + 2] = Math.round(outB * 255);
        data[i + 3] = source[i + 3];
    }

    return imageData;
}