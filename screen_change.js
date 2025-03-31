
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-database.js";

// Firebase 設定與初始化
const firebaseConfig = {
    apiKey: "AIzaSyAqnklEsaSCiq4IwVh4FtD7Ubc5H2DUrnI",
    authDomain: "thepomoli.firebaseapp.com",
    databaseURL: "https://thepomoli-default-rtdb.firebaseio.com",
    projectId: "thepomoli",
    storageBucket: "thepomoli.firebasestorage.app",
    messagingSenderId: "59738069258",
    appId: "1:59738069258:web:958f4f61801e7ea18f02f3",
    measurementId: "G-P0BN7JD7X6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let hasStarted = false;
let audioContext;
let bgmSource;
let analyser;
let gainNode;


$(document).ready(function () {

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const bgm = document.getElementById('playpagebgmusic');
    bgmSource = audioContext.createMediaElementSource(bgm);
    analyser = audioContext.createAnalyser();
    gainNode = audioContext.createGain();

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 5);

    bgmSource.connect(analyser);
    analyser.connect(audioContext.destination);
    bgmSource.connect(gainNode);
    gainNode.connect(audioContext.destination);

    updateDisplayStatus();

    const video = $('#storypage_video')[0];
    // const audio = $('#storypage_audio')[0];

    // 空白鍵觸發從 loadingpage 到 storypage
    $(document).on('keydown', function (e) {
        if (e.code === 'Space' && !hasStarted) {
            hasStarted = true;
            e.preventDefault();

            $('#loadingpage').fadeOut(100, function () {
                $('#storypage').fadeIn(100, function () {
                    video.currentTime = 0;
                    // audio.currentTime = 0;

                    video.play().catch(err => {
                        console.warn('video 播放失敗：', err);
                    });
                });
            });
        }
    });

    video.addEventListener('ended', function () {
        $('#storypage').fadeOut(0, function () {
            $('#replaypage').fadeIn(0, function () {
                const handvideo1 = document.getElementById('handvideo1');
                const handvideo2 = document.getElementById('handvideo2');
                handvideo1.play();
                $('#handvideo1').fadeOut();
                $('#handvideo2').fadeIn();
                handvideo2.currentTime = 0;
                handvideo2.pause();

                setupReplayLogic(); // 新增的控制播放邏輯
            });
        });
    });

    function startPlayPageSequence() {
        const delayBetween = 200;
        const wallbgs = ['#wallbg2', '#wallbg3', '#wallbg4', '#wallbg5', ".wh"];

        $.each(wallbgs, function (index, id) {
            setTimeout(function () {
                $(id).addClass('show');
            }, delayBetween * index);
        });

        const totalDelay = delayBetween * wallbgs.length + 400;
        setTimeout(function () {
            $('.container canvas').addClass('show');
            const bgm = document.getElementById('playpagebgmusic');
            bgm.play(); // 不再建立 source，直接播放
        }, totalDelay);
    }

    function setupReplayLogic() {
        const handvideo2 = document.getElementById('handvideo2');
        handvideo2.pause();
        handvideo2.currentTime = 0;

        let lastPlayAttempt = 0;
        let lastDirection = 0;

        const interval = setInterval(() => {
            const hands = window.handKeypoints;
            let newDirection = 0;

            if (!hands || hands.length !== 2) {
                newDirection = -1;
            } else {
                let left = hands.find(h => h[0].x < h[9].x);
                let right = hands.find(h => h[0].x > h[9].x);
                if (left && right && isHandOpen(left) && isHandOpen(right)) {
                    newDirection = 1;
                } else {
                    newDirection = -1;
                }
            }

            if (newDirection !== lastDirection) {
                lastDirection = newDirection;
                lastPlayAttempt = Date.now(); // 記錄方向變化的時間
            }

            // 控制播放方向
            if (newDirection === 1) {
                if (handvideo2.paused && Date.now() - lastPlayAttempt > 100) {
                    handvideo2.play().catch(err => {
                        console.warn("play() 被中斷：", err);
                    });
                }
            } else if (newDirection === -1) {
                if (!handvideo2.paused && Date.now() - lastPlayAttempt > 100) {
                    handvideo2.pause();
                }
                if (handvideo2.currentTime > 0.04) {
                    handvideo2.currentTime -= 0.04;
                } else {
                    handvideo2.currentTime = 0;
                }
            }

        }, 40);


        // ✅ 播放到結尾，準備進入 playpage
        handvideo2.addEventListener('ended', () => {
            clearInterval(interval);
            $('#replaypage').fadeOut(0, function () {
                $('#playpage').fadeIn(0, () => {
                    set(ref(db, 'displayStatus'), 'show').catch(console.error);
                    const wallbg1 = document.getElementById('wallbg1');
                    wallbg1.play();
                    startPlayPageSequence();
                });
            });
        });
    }


    // ✅ 監控 playpage 是否被隱藏
    const observer = new MutationObserver(updateDisplayStatus);
    const targetNode = document.getElementById('playpage');
    observer.observe(targetNode, { attributes: true, attributeFilter: ['style', 'class'] });

    function isHandOpen(hand) {
        const tips = [8, 12, 16, 20];
        const base = hand[0];
        return tips.every(i => hand[i].y < base.y);
    }

});

window.addEventListener('beforeunload', () => {
    set(ref(db, 'displayStatus'), 'hide').catch(console.error);
});

function updateDisplayStatus() {
    const isHidden = $('#playpage').css('display') === 'none';
    const status = isHidden ? 'hide' : 'show';
    set(ref(db, 'displayStatus'), status).catch(console.error);
}

