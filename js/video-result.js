import MP4Box from 'https://esm.sh/mp4box@0.5.2';
import {Muxer, ArrayBufferTarget} from 'https://esm.sh/mp4-muxer@5.1.3';
import {daltonizeImageData} from './video-daltonize.js';
import {loadColorMedia} from './color-storage.js';
import {createVideoProcessor} from './video-converter.js';

function getVideoExtradata(mp4boxfile, trackId){
  const trak = mp4boxfile.getTrackById(trackId);

  for(const entry of trak.mdia.minf.stbl.stsd.entries){
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;

    if(box){
      const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);

      box.write(stream);

      return new Uint8Array(stream.buffer, 8);
    }
  }

  return undefined;
}

function getAudioSpecificConfig(mp4boxfile, trackId){
  try{
    const trak = mp4boxfile.getTrackById(trackId);
    const entry = trak.mdia.minf.stbl.stsd.entries[0];

    return entry?.esds?.esd?.descs?.[0]?.descs?.[0]?.data;
  }
  catch{
    return undefined;
  }
}

export async function exportConvertedVideo(file, colorType, { onProgress } = {}){
  if(!('VideoDecoder' in window) || !('VideoEncoder' in window)){
    throw new Error('현재 브라우저는 고속 변환(WebCodecs)을 지원하지 않습니다. 최신 Chrome 또는 Edge를 이용해 주세요.');
  }

  const arrayBuffer = await file.arrayBuffer();
  arrayBuffer.fileStart = 0;

  const workCanvas = document.createElement('canvas');
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true });

  return new Promise((resolve, reject) => {
    const mp4boxfile = MP4Box.createFile();

    let muxer = null;
    let videoDecoder = null;
    let videoEncoder = null;

    let videoTrack = null;
    let audioTrack = null;
    let totalVideoSamples = 0;
    let queuedSamples = 0;
    let processedSamples = 0;
    let pendingSamples = [];
    let isDecodingStarted = false;

    mp4boxfile.onError = (e) => reject(new Error(`MP4 분석 오류: ${e}`));

    mp4boxfile.onReady = async (info) => {
      try{
        videoTrack = info.videoTracks[0];

        if(!videoTrack){
          throw new Error('동영상에서 비디오 트랙을 찾을 수 없습니다.');
        }

        const width = videoTrack.video.width & ~1;
        const height = videoTrack.video.height & ~1;
        workCanvas.width = width;
        workCanvas.height = height;
        totalVideoSamples = videoTrack.nb_samples;

        const candidateAudio = info.audioTracks[0];
        let audioConfig = null;

        if(candidateAudio && candidateAudio.codec.startsWith('mp4a')){
          const asc = getAudioSpecificConfig(mp4boxfile, candidateAudio.id);

          if(asc){
            audioTrack = candidateAudio;
            audioConfig = {codec: 'aac', numberOfChannels: audioTrack.audio.channel_count, sampleRate: audioTrack.audio.sample_rate};
          }
        }

        muxer = new Muxer({
          target: new ArrayBufferTarget(),
          video: { codec: 'avc', width, height },
          audio: audioConfig || undefined,
          fastStart: 'in-memory'
        });

        const encoderCodec = width * height > 1920 * 1080 ? 'avc1.640033' : 'avc1.640028';
        videoEncoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (e) => reject(e)
        });

        videoEncoder.configure({
          codec: encoderCodec,
          width,
          height,
          bitrate: Math.max(2_000_000, Math.round(width * height * 4)),
          framerate: 30
        });

        videoDecoder = new VideoDecoder({
          output: (videoFrame) => {
            ctx.drawImage(videoFrame, 0, 0, width, height);
            const imgData = ctx.getImageData(0, 0, width, height);
            daltonizeImageData(imgData, colorType);
            ctx.putImageData(imgData, 0, 0);

            const convertedFrame = new VideoFrame(workCanvas, {timestamp: videoFrame.timestamp, duration: videoFrame.duration});

            videoFrame.close();

            const isKeyFrame = processedSamples % 60 === 0;
            videoEncoder.encode(convertedFrame, {keyFrame: isKeyFrame});
            convertedFrame.close();

            processedSamples++;

            if(onProgress && totalVideoSamples > 0){
              const percent = Math.min(99, Math.round((processedSamples / totalVideoSamples) * 100));

              onProgress(percent);
            }
          },
          error: (e) => reject(e)
        });

        videoDecoder.configure({
          codec: videoTrack.codec,
          codedWidth: videoTrack.video.width,
          codedHeight: videoTrack.video.height,
          description: getVideoExtradata(mp4boxfile, videoTrack.id)
        });

        mp4boxfile.setExtractionOptions(videoTrack.id, 'video', { nbSamples: 1000 });

        if(audioTrack){
          mp4boxfile.setExtractionOptions(audioTrack.id, 'audio', { nbSamples: 1000 });
        }

        mp4boxfile.start();
      }
      catch (err) {
        reject(err);
      }
    };

    mp4boxfile.onSamples = (trackId, user, samples) => {
      if(user === 'audio' && muxer){
        const asc = getAudioSpecificConfig(mp4boxfile, trackId);

        samples.forEach((sample, idx) => {
          const timestamp = (sample.cts * 1_000_000) / sample.timescale;
          const duration = (sample.duration * 1_000_000) / sample.timescale;
          const meta = idx === 0 && asc ? {
            decoderConfig: {
              codec: audioTrack.codec,
              numberOfChannels: audioTrack.audio.channel_count,
              sampleRate: audioTrack.audio.sample_rate,
              description: asc
            }
          } : undefined;

          muxer.addAudioChunkRaw(sample.data, 'key', timestamp, duration, meta);
        });

        return;
      }

      if(user === 'video'){
        pendingSamples.push(...samples);

        if(!isDecodingStarted){
          isDecodingStarted = true;
          processDecodeQueue();
        }
      }
    };

    async function processDecodeQueue(){
      try{
        while(pendingSamples.length > 0){
          if(videoDecoder.decodeQueueSize > 10 || videoEncoder.encodeQueueSize > 10){
            await new Promise((r) => setTimeout(r, 5));
            continue;
          }

          const sample = pendingSamples.shift();
          const chunk = new EncodedVideoChunk({
            type: sample.is_sync ? 'key' : 'delta',
            timestamp: (sample.cts * 1_000_000) / sample.timescale,
            duration: (sample.duration * 1_000_000) / sample.timescale,
            data: sample.data
          });

          queuedSamples++;
          videoDecoder.decode(chunk);
        }

        if(queuedSamples >= totalVideoSamples){
          await videoDecoder.flush();
          await videoEncoder.flush();
          videoDecoder.close();
          videoEncoder.close();

          muxer.finalize();

          if(onProgress){
            onProgress(100);
          }

          const blob = new Blob([muxer.target.buffer], {type: 'video/mp4'});
          const downloadUrl = URL.createObjectURL(blob);

          const originalName = file.name.replace(/\.[^.]+$/, '');
          const downloadName = `${originalName}-readly-converted.mp4`;

          const a = document.createElement('a');

          a.href = downloadUrl;
          a.download = downloadName;
          a.click();

          URL.revokeObjectURL(downloadUrl);
          resolve();
        }
        else{
          setTimeout(processDecodeQueue, 10);
        }
      }
      catch(err){
        reject(err);
      }
    }

    mp4boxfile.appendBuffer(arrayBuffer);
    mp4boxfile.flush();
  });
}

const COLOR_TYPE_LABELS = {protan: '적색 계열 (Protan)', deutan: '녹색 계열 (Deutan)', tritan: '청색 계열 (Tritan)'};

const PLAY_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z" fill="currentColor"/></svg>`;
const PAUSE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>`;

function formatTime(seconds){
    if(!Number.isFinite(seconds)){
        return '00:00';
    }

    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);

    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

async function initVideoResult(){
    const mediaData = await loadColorMedia();

    if(!mediaData || !mediaData.file){
        alert('업로드된 동영상이 없습니다. 업로드 화면으로 이동합니다.');
        window.location.href = 'color-upload.html';
        return;
    }

    const {file, colorType} = mediaData;

    const typeValueEl = document.querySelector('.applied-type__value');
    const downloadBtn = document.querySelector('.page-actions .btn--primary');

    const screenEl = document.querySelector('.player__screen');
    const badgeEl = document.querySelector('.player__badge');
    const [originalBtn, convertedBtn] = document.querySelectorAll('.player__toggle button');
    const bigPlayBtn = document.querySelector('.player__big-play');
    const playBtn = document.querySelector('.player__play');
    const timeEl = document.querySelector('.player__time');
    const progressInput = document.querySelector('.player__progress');
    const fullscreenBtn = document.querySelector('.player__fullscreen');

    const videoEl = document.createElement('video');
    videoEl.playsInline = true;
    videoEl.hidden = true;

    const canvasEl = document.createElement('canvas');
    canvasEl.style.width = '100%';
    canvasEl.style.height = '100%';
    canvasEl.style.objectFit = 'contain';
    canvasEl.style.display = 'block';

    screenEl.prepend(videoEl, canvasEl);

    badgeEl.style.zIndex = '2';
    bigPlayBtn.style.zIndex = '2';

    typeValueEl.textContent = COLOR_TYPE_LABELS[colorType] || COLOR_TYPE_LABELS.protan;

    const processor = createVideoProcessor(videoEl, canvasEl, colorType);

    videoEl.src = URL.createObjectURL(file);

    function togglePlay(){
        if(videoEl.paused || videoEl.ended){
            videoEl.play();
        }
        else{
            videoEl.pause();
        }
    }

    bigPlayBtn.addEventListener('click', togglePlay);
    playBtn.addEventListener('click', togglePlay);
    canvasEl.addEventListener('click', togglePlay);

    videoEl.addEventListener('play', () => {
        bigPlayBtn.hidden = true;
        playBtn.innerHTML = PAUSE_ICON;
        playBtn.setAttribute('aria-label', '일시정지');
    });

    videoEl.addEventListener('pause', () => {
        bigPlayBtn.hidden = false;
        playBtn.innerHTML = PLAY_ICON;
        playBtn.setAttribute('aria-label', '재생');
    });

    function updatePlayerSize(){
        if(!videoEl.videoWidth || !videoEl.videoHeight){
            return;
        }

        if(document.fullscreenElement === screenEl){
            screenEl.style.width = '';
            screenEl.style.maxWidth = '';
            screenEl.style.height = '';
            screenEl.style.minHeight = '';
            screenEl.style.aspectRatio = '';
            screenEl.style.margin = '';
            return;
        }

        const videoRatio = videoEl.videoWidth / videoEl.videoHeight;

        screenEl.style.aspectRatio = `${videoEl.videoWidth} / ${videoEl.videoHeight}`;
        screenEl.style.width = '100%';
        screenEl.style.height = 'auto';
        screenEl.style.minHeight = '0';

        if(videoEl.videoHeight >= videoEl.videoWidth){
            const maxHeight = window.innerHeight * 0.72;
            const targetWidth = Math.max(320, Math.round(maxHeight * videoRatio));
            screenEl.style.maxWidth = `${targetWidth}px`;
            screenEl.style.margin = '0 auto';
        }
        else{
            screenEl.style.maxWidth = '100%';
            screenEl.style.margin = '';
        }
    }

    videoEl.addEventListener('loadedmetadata', () => {
        progressInput.max = Math.floor(videoEl.duration);
        progressInput.value = 0;
        timeEl.textContent = `00:00 / ${formatTime(videoEl.duration)}`;
        updatePlayerSize();
    });

    videoEl.addEventListener('timeupdate', () => {
        progressInput.value = Math.floor(videoEl.currentTime);
        timeEl.textContent = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration)}`;
    });

    progressInput.addEventListener('input', () => {
        videoEl.currentTime = Number(progressInput.value);
    });

    originalBtn.addEventListener('click', () => {
        originalBtn.setAttribute('aria-pressed', 'true');
        convertedBtn.setAttribute('aria-pressed', 'false');
        badgeEl.textContent = '원본 영상 보는 중';
        processor.setOriginalMode(true);
    });

    convertedBtn.addEventListener('click', () => {
        originalBtn.setAttribute('aria-pressed', 'false');
        convertedBtn.setAttribute('aria-pressed', 'true');
        badgeEl.textContent = '변환 결과 보는 중';
        processor.setOriginalMode(false);
    });

    fullscreenBtn.addEventListener('click', () => {
        if(!document.fullscreenElement){
            screenEl.requestFullscreen().catch(() => {});
        }
        else{
            document.exitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', updatePlayerSize);

    downloadBtn.addEventListener('click', async () => {
        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.disabled = true;
        downloadBtn.textContent = '변환 준비 중... (0%)';

        try{
            await exportConvertedVideo(file, colorType, {
                onProgress: (percent) => {
                    downloadBtn.textContent = `변환 저장 중... (${percent}%)`;
                }
            });
        }
        catch(error){
            console.error(error);
            alert(error.message || '동영상 변환 중 오류가 발생했습니다.');
        }
        finally{
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalHTML;
        }
    });
}

initVideoResult();