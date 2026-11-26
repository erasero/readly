import {daltonizeImageData} from "./video-daltonize.js";

export function createVideoProcessor(videoElement, canvasElement, colorType){
    const ctx = canvasElement.getContext('2d', {willReadFrequently: true});
    let isRunning = false;
    let isOriginalMode = false;

    const supportsRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

    function renderSingleFrame(){
        if(videoElement.readyState < 2){
            return;
        }

        const width = canvasElement.width;
        const height = canvasElement.height;

        ctx.drawImage(videoElement, 0, 0, width, height);

        if(!isOriginalMode){
            const frameData = ctx.getImageData(0, 0, width, height);
            const convertedData = daltonizeImageData(frameData, colorType);
            ctx.putImageData(convertedData, 0, 0);
        }
    }

    function frameLoop(){
        if(!isRunning){
            return;
        }

        renderSingleFrame();

        if(!videoElement.paused && !videoElement.ended){
            if(supportsRVFC){
                videoElement.requestVideoFrameCallback(frameLoop);
            }
            else{
                requestAnimationFrame(frameLoop);
            }
        }
        else{
            isRunning = false;
        }
    }

    function startLoop(){
        if(isRunning){
            return;
        }

        isRunning = true;

        if(supportsRVFC){
            videoElement.requestVideoFrameCallback(frameLoop);
        }
        else{
            requestAnimationFrame(frameLoop);
        }
    }

    videoElement.addEventListener('loadedmetadata', () => {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
    });

    videoElement.addEventListener('loaddeddata', renderSingleFrame);
    videoElement.addEventListener('play', startLoop);
    videoElement.addEventListener('seeked', renderSingleFrame);

    return{
        setOriginalMode(enabled){
            isOriginalMode = enabled;
            renderSingleFrame();
        },
        forceRender: renderSingleFrame
    };
}