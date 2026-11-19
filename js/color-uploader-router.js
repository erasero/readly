import {colorUploader} from './color-uploader.js';
import {saveColorMedia} from './color-storage.js';

colorUploader({
    onSubmit: async ({file, mediaType, colorType}) => {
        //색상 변환 관련 저장소에 파일 및 색각 유형 저장
        saveColorMedia({file, colorType});

        //미디어 종류에 따라 결과 페이지로 이동
        await saveColorMedia({file, colorType});

        if(mediaType === 'video'){
            window.location.href = 'video-result.html';
        }
    }
})