//selected-file 아이콘(HTML 코드랑 동일 스타일이며 선택된 파일 확장자에 따라 어떤 아이콘이 올지 결정)
const ICONS = {
    image: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M3.5 18l5-5 4 4 3-3 5 5"/></svg>`,
    video: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor"/></svg>`
};

const ALLOWED_VIDEOS = ['video/mp4'];

//selected-file의 용량 표시 부분을 위해 바이트 단위를 MB/KB 단위로 변경
function formatFileSize(bytes){
    if(bytes < 1024 * 1024){
        return `${(bytes / 1024).toFixed(1)}KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function colorUploader({onSubmit}){
    const form = document.querySelector('.upload-layout');
    const dropzone = form.querySelector('.dropzone');
    const fileInput = form.querySelector('input[name="media]');

    const selectedBox = form.querySelector('.selected-file');
    const selectedIcon = form.querySelector('.selected-file__icon');
    const selectedName = form.querySelector('.selected-file__name');
    const selectedMeta = form.querySelector('.selected-file__meta');
    const removeBtn = form.querySelector('.selected-file__remove');

    let currentFile = null;
    let currentMediaType = null; //image or video

    //업로드된 파일 에러 확인 및 selected-file 갱신
    function handleFile(file){
        if(!file){
            return;
        }

        if(ALLOWED_VIDEOS.includes(file.type)){
            currentMediaType = 'video';
        }
        else{
            alert('JPG, PNG 이미지 또는 MP4 동영상만 업로드할 수 있습니다.');
            fileInput.value = '';
            return;
        }

        currentFile = file;

        //아이콘, 파일명, 용량 업데이트
        const typeLabel = currentMediaType === 'video' ? '동영상' : '이미지';
        selectedIcon.innerHTML = ICONS[currentMediaType];
        selectedName.textContent = file.name;
        selectedMeta.textContent = `${typeLabel} · ${formatFileSize(file.size)}`;
        selectedBox.hidden = false;
    }

    //클릭해서 파일 선택
    fileInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    //드래그 앤 드롭으로 파일 업로드
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('is-dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
        handleFile(e.dataTransfer.files[0]);
    });

    //삭제 버튼 클릭 시 초기화
    removeBtn.addEventListener('click', () => {
        currentFile = null;
        currentMediaType = null;
        fileInput.value = '';
        selectedBox.hidden = true;
    });

    //변환하기 버튼 클릭 시
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if(!currentFile){
            alert('변환할 이미지나 동영상을 먼저 업로드해 주세요!');
            return;
        }

        const selectedColorType = form.querySelector('input[name="type"]:checked').value;

        //파일, 미디어 종류, 색각 유형을 color-uploader-router.js로 전달
        onSubmit({file: currentFile, mediaType: currentMediaType, colorType: selectedColorType});
    });
}