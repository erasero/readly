const DB_NAME = 'ReadlyColorDB';
const STORE_NAME = 'colorUploadStore';
const DATA_KEY = 'latestMedia';

//IndexedDB 열기
function openDB(){
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

//업로드 페이지에서 파일과 색각 유형 저장하기
export async function saveColorMedia({file, colorType}){
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');

    tx.objectStore(STORE_NAME).put({ file, colorType }, DATA_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

//결과 페이지(image-result.html, video-result.html)에서 꺼내오기
export async function loadColorMedia(){
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(DATA_KEY);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}