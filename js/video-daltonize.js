const STRENGTH = {protan: 1.0, deutan: 1.25, tritan: 0.6};

//색각 유형별 시뮬레이션 및 보정
export function daltonizeImageData(imageData, colorType){
    const data = imageData.data;

    for(let i = 0; i < data.length; i += 4){
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        //RGB에서 LMS 원추세포 반응값으로 변환
        const L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
        const M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
        const S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;

        //색각 유형에 따른 시뮬레이션 값 계산
        let lSim = L;
        let mSim = M;
        let sSim = S;

        if(colorType === 'protan'){
            lSim = 2.02344 * M - 2.52581 * S;
        }
        else if(colorType === 'deutan'){
            mSim = 0.494207 * L + 1.24827 * S;
        }
        else if(colorType === 'tritan'){
            sSim = -0.395913 * L + 0.801109 * M;
        }

        //시뮬레이션 LMS에서 RGB로 역변환
        const rSim = 0.0809444479 * lSim - 0.130504409 * mSim + 0.116721066 * sSim;
        const gSim = -0.0102485335 * lSim + 0.0540193266 * mSim - 0.113614708 * sSim;
        const bSim = -0.000365296938 * lSim - 0.00412161469 * mSim + 0.693511405 * sSim;

        //원본과 시뮬레이션 간 오차 추출
        const errR = r - rSim;
        const errG = g - gSim;
        const errB = b - bSim;

        //오차를 인지 가능한 채널로 이동시켜 원본에 보정 적용
        let outR = r;
        let outG = g;
        let outB = b;

        if(colorType === 'protan'){
            const s = STRENGTH.protan;
            outG = g + s * (0.7 * errR + errG);
            outB = b + s * (0.7 * errR + errB);
        }
        else if(colorType === 'deutan'){
            const s = STRENGTH.deutan;
            outR = r + s * (0.4 * errR - 0.3 * errG);
            outG = g + s * (0.5 * errG);
            outB = b + s * (0.85 * errG - 0.5 * errR + errB);
        }
        else if(colorType === 'tritan'){
            const s = STRENGTH.tritan;
            outR = r + s * (errR + 0.7 * errB);
            outG = g + s * (errG + 0.7 * errB);
        }

        data[i] = Math.min(255, Math.max(0, outR));
        data[i + 1] = Math.min(255, Math.max(0, outG));
        data[i + 2] = Math.min(255, Math.max(0, outB));
    }

    return imageData
}