let trackingReady = false;
let videoReady = false;

async function setupHandTracking() {
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
        runtime: 'mediapipe',
        modelType: 'full',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        maxHands: 4
    };

    const detector = await handPoseDetection.createDetector(model, detectorConfig);

    async function detectHands() {
        const video = document.getElementById('input-video');
        const hands = await detector.estimateHands(video, { flipHorizontal: true });
        window.handKeypoints = hands.length > 0 ? hands.map(hand => hand.keypoints) : null;
        requestAnimationFrame(detectHands);
    }

    detectHands();
    trackingReady = true;
}

document.addEventListener('DOMContentLoaded', async () => {

    const video = document.getElementById('input-video');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.onloadeddata = async () => {
            videoReady = true;
            await setupHandTracking();
            checkAllReady();
        };
    } catch (err) {
        console.error('攝影機啟動失敗:', err);
        alert("請允許攝影機權限");
    }
});

function checkAllReady() {
    if (videoReady  && trackingReady && typeof setup === 'function') {
        setup();
    }
}