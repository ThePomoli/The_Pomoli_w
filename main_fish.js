let myP5 = new p5((p) => {
    let fishArray = [];
    const numFish = 40;
    let fishTextures = [];
    let leafImage;
    let assetsLoaded = false;
    const palmPolygonIndices = [0, 1, 2, 3, 5, 9, 13, 17, 0];
    let whImageIndex = 1;
    let whTargetIndex = 1;
    let whChangeDelay = 200;
    let lastWhChangeTime = 0;
    const fishLayerCanvases = [];
    const pinchThreshold = 30;
    let playStartTime = 0;
    let whInteractionLockUntil = 0;

    p.preload = function () {
        let loadedCount = 0;
        const totalAssets = 30 + 1;

        for (let i = 1; i <= 30; i++) {
            let gif = p.createVideo(`./img/${i}.webm`, () => {
                gif.loop();
                gif.hide();
                fishTextures.push(gif.elt);
                loadedCount++;
                if (loadedCount === totalAssets) {
                    assetsLoaded = true;
                }
            });
        }

        p.loadImage('./img/leaf.png',
            (img) => {
                leafImage = img;
                loadedCount++;
                if (loadedCount === totalAssets) {
                    assetsLoaded = true;
                }
            },
            () => { console.warn("leaf.PNG 載入失敗"); }
        );
    };

    p.setup = function () {
        p.smooth();
        // 取得 playpage container 和 wallbg1 元素
        const container = document.querySelector('#playpage .container');
        const wallbg1 = document.getElementById('wallbg1'); // 這是你想要的背景圖

        if (!container || !wallbg1 || wallbg1.offsetWidth === 0 || wallbg1.offsetHeight === 0) {
            setTimeout(p.setup, 100);
            return;
        }

        // 使用 wallbg1 的寬高來設置 canvas
        const canvasWidth = wallbg1.offsetWidth;
        const canvasHeight = wallbg1.offsetHeight;

        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        container.appendChild(canvas.elt);
        canvas.elt.setAttribute('willReadFrequently', 'true');

        for (let i = 0; i < 5; i++) {
            const layerCanvas = document.getElementById(`fishlayer${i}`);
            layerCanvas.width = canvasWidth;
            layerCanvas.height = canvasHeight;
            const ctx = layerCanvas.getContext('2d');

            // **重點：打開平滑**
            ctx.imageSmoothingEnabled = true;
            // 若瀏覽器支援，可設定品質為 high
            if ('imageSmoothingQuality' in ctx) {
                ctx.imageSmoothingQuality = 'high';
            }

            fishLayerCanvases.push(ctx);
        }

        // 設置 fishArray 和其他設定
        const margin = 100;  // 魚一開始距離畫布邊界的距離
        for (let i = 0; i < numFish; i++) {
            let x, y;
            // 隨機決定從哪一邊飛入：left / top / right
            const edge = p.random(['left', 'top', 'right']);
            if (edge === 'left') {
                x = -margin;
                y = p.random(0, p.height * 0.7);
            } else if (edge === 'right') {
                x = p.width + margin;
                y = p.random(0, p.height * 0.7);
            } else {  // top
                x = p.random(0, p.width);
                y = -margin;
            }
            fishArray.push(new Fish(x, y));
        }

        // 窗口調整時更新 canvas 大小
        function windowResized() {
            const wallbg1 = document.getElementById('wallbg1');
            if (wallbg1) {
                const newCanvasWidth = wallbg1.offsetWidth;
                const newCanvasHeight = wallbg1.offsetHeight;
                p.resizeCanvas(newCanvasWidth, newCanvasHeight);
            }
        }

        window.addEventListener('resize', windowResized);
        playStartTime = Date.now();
    };


    p.draw = function () {
        if (!assetsLoaded) return;

        if (window.handKeypoints) {
            window.handKeypointsSpeed = window.handKeypoints.map((hand, handIndex) => {
                return hand.map((kp, kpIndex) => {
                    if (window.prevHandKeypoints &&
                        window.prevHandKeypoints[handIndex] &&
                        window.prevHandKeypoints[handIndex][kpIndex]) {
                        return p.dist(kp.x, kp.y, window.prevHandKeypoints[handIndex][kpIndex].x, window.prevHandKeypoints[handIndex][kpIndex].y);
                    }
                    return Infinity;
                });
            });
            window.prevHandKeypoints = window.handKeypoints.map(hand => hand.map(kp => ({ x: kp.x, y: kp.y })));
        }

        for (let ctx of fishLayerCanvases) {
            ctx.clearRect(0, 0, p.width, p.height);
        }
        p.clear();

        if (window.handKeypoints) {
            const video = document.getElementById('input-video');
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            for (let handIndex = 0; handIndex < window.handKeypoints.length; handIndex++) {
                let keypoints = window.handKeypoints[handIndex];

                let palmWidth = p.dist(
                    keypoints[0].x, keypoints[0].y,
                    keypoints[9].x, keypoints[9].y
                );

                let scaleFactor = p.map(palmWidth, 50, 150, 0.5, 1.5, true);

                for (let i = 0; i < keypoints.length; i++) {
                    const kp = keypoints[i];
                    const mapped = mapToCanvas(kp.x, kp.y, videoWidth, videoHeight);

                    p.push();
                    p.translate(mapped.x, mapped.y);
                    p.imageMode(p.CENTER);
                    let leafSize = p.random(28, 35) * scaleFactor;
                    p.image(leafImage, 0, 0, leafSize, leafSize);
                    p.pop();

                    const extraLeafPairs = [
                        [8, 7], [7, 6], [6, 5],
                        [9, 10], [10, 11], [11, 12],
                        [13, 14], [14, 15], [15, 16],
                        [17, 18], [18, 19], [19, 20],
                        [0, 1], [1, 2], [2, 3], [3, 4]
                    ];

                    for (let [a, b] of extraLeafPairs) {
                        const kp1 = keypoints[a];
                        const kp2 = keypoints[b];
                        const mapped1 = mapToCanvas(kp1.x, kp1.y, videoWidth, videoHeight);
                        const mapped2 = mapToCanvas(kp2.x, kp2.y, videoWidth, videoHeight);

                        const midX = (mapped1.x + mapped2.x) / 2;
                        const midY = (mapped1.y + mapped2.y) / 2;
                        const angle = p.atan2(mapped2.y - mapped1.y, mapped2.x - mapped1.x);

                        p.push();
                        p.translate(midX, midY);
                        p.rotate(angle);
                        p.imageMode(p.CENTER);
                        let leafSize = p.random(28, 35) * scaleFactor;
                        p.image(leafImage, 0, 0, leafSize, leafSize);
                        p.pop();
                    }
                }

                let polygon = getPalmPolygonPoints(keypoints, videoWidth, videoHeight);
                polygon.push(polygon[0]);
                let numRings = p.floor(p.map(scaleFactor, 0.5, 2.5, 3, 5));
                let shrinkStep = 30 * scaleFactor;
                let shrinkAmounts = Array.from({ length: numRings }, (_, i) => i * shrinkStep);

                for (let ring = 0; ring < shrinkAmounts.length; ring++) {
                    let shrinked = shrinkPolygon(polygon.slice(0, -1), shrinkAmounts[ring]);
                    drawLeafAlongPolygon(p, shrinked, scaleFactor);
                }
            }

            window.handKeypoints.forEach((hand) => {
                const thumb = hand[4];
                const index = hand[8];
                const mappedThumb = mapToCanvas(thumb.x, thumb.y, videoWidth, videoHeight);
                const mappedIndex = mapToCanvas(index.x, index.y, videoWidth, videoHeight);
                // --- 計算 canvas 座標下的捏合中心和距離 ---
                const t = mapToCanvas(thumb.x, thumb.y, videoWidth, videoHeight);
                const i = mapToCanvas(index.x, index.y, videoWidth, videoHeight);
                const midX = (t.x + i.x) / 2;
                const midY = (t.y + i.y) / 2;
                const pinchDist = p.dist(t.x, t.y, i.x, i.y);

                if (pinchDist < pinchThreshold) {
                    fishArray.forEach(fish => {
                        if (!fish.pinned) {
                            // 用 canvas 座標來算魚和中點的距離
                            if (p.dist(fish.position.x, fish.position.y, midX, midY) < pinchThreshold) {
                                fish.pinned = true;
                                // 這裡確定都是 canvas 座標
                                fish.pinOffset = p.createVector(fish.position.x - midX, fish.position.y - midY);
                            }
                        }
                    });
                } else {
                    fishArray.forEach(fish => {
                        fish.pinned = false;
                        fish.pinOffset.set(0, 0);
                    });
                }

            });
        }

        {
            // 閾值設定，可按實驗結果微調
            const pokeSpeedThreshold = 5;  // 超過這個速度就視為「戳」
            const strokeSpeedThreshold = 1;  // 低於這個速度就視為「撫摸」

            const whDiv = document.querySelector('.wh');
            const whImg = whDiv.querySelector('img');
            const rect = whDiv.getBoundingClientRect();
            const canvasRect = p.canvas.getBoundingClientRect();
            let interaction = null;

            if (window.handKeypoints && window.handKeypointsSpeed) {
                const video = document.getElementById('input-video');
                const vw = video.videoWidth, vh = video.videoHeight;

                outer:
                for (let h = 0; h < window.handKeypoints.length; h++) {
                    for (let k = 0; k < window.handKeypoints[h].length; k++) {
                        const kp = window.handKeypoints[h][k];
                        const speed = window.handKeypointsSpeed[h][k];
                        // 將影片座標轉成 canvas 上的 page 座標
                        const mapped = mapToCanvas(kp.x, kp.y, vw, vh);
                        const pageX = mapped.x + canvasRect.left;
                        const pageY = mapped.y + canvasRect.top;
                        if (
                            pageX >= rect.left && pageX <= rect.right &&
                            pageY >= rect.top && pageY <= rect.bottom
                        ) {
                            if (speed > pokeSpeedThreshold) {
                                interaction = 'poke';
                            } else if (speed > 0 && speed <= strokeSpeedThreshold) {
                                interaction = 'stroke';
                            }
                            break outer;
                        }
                    }
                }
            }

            // 只有當目前 wh 圖已經是 wh1.png（即 whImageIndex === 1）時，才做臨時覆蓋
            if (whImageIndex === 1) {
                const now = Date.now();
                if (now >= whInteractionLockUntil) {
                    if (interaction === 'poke' && !whImg.src.endsWith('wh1_1.png')) {
                        whImg.src = './img/wh1_1.png';
                        whInteractionLockUntil = now + 1000; // 鎖 1 秒
                    } else if (interaction === 'stroke' && !whImg.src.endsWith('wh1_2.png')) {
                        whImg.src = './img/wh1_2.png';
                        whInteractionLockUntil = now + 1000; // 鎖 1 秒
                    } else if (!interaction && !whImg.src.endsWith('wh1.gif')) {
                        whImg.src = './img/wh1.gif';
                    }
                }
            }
        }

        for (let fish of fishArray) {
            fish.update();
            fish.checkHandCollision();
        }
        for (let fish of fishArray) {
            fish.displayToLayer(fishLayerCanvases[fish.depthLayer]);
        }

        // 判斷是否有魚停在手上
        let now = Date.now();
        const MIN_LANDED_FISH = 8;
        const MIN_LANDED_TIME = 0;

        let landedFishCount = fishArray.filter(fish => fish.landed && (now - fish.landedTime >= MIN_LANDED_TIME)).length;
        whTargetIndex = landedFishCount >= MIN_LANDED_FISH ? 26 : 1;


        // 換圖的動畫控制
        //let now = Date.now();


        if(playStartTime!==0){
            //console.log(now - playStartTime );
            if (now - playStartTime > 30000) {
                if (now - lastWhChangeTime > whChangeDelay) {
                    if (whImageIndex !== whTargetIndex) {
                        if (whImageIndex < whTargetIndex) {
                            whImageIndex++;
                        } else {
                            whImageIndex--;
                        }
    
                        let whImg = document.querySelector('.wh img');
                        const ext = whImageIndex === 1 ? 'gif' : 'png';
                        const newSrc = `./img/wh${whImageIndex}.${ext}`;
    
                        // 创建一个新的 Image 对象
                        const tempImg = new Image();
                        tempImg.onload = function () {
                            whImg.src = newSrc;
                            lastWhChangeTime = now;
                        };
                        tempImg.src = newSrc;
                    }
                }
            }
        }
    };

    class Fish {
        constructor(x, y) {
            this.position = p.createVector(x, y);
            this.baseSpeed = p.random(0.5, 0.8);
            this.speed = this.baseSpeed;
            this.maxEscapeSpeed = 15;
            this.angle = p.random(p.TWO_PI);
            this.targetAngle = this.angle;
            this.changeDirectionInterval = p.int(p.random(100, 300));
            this.centerAttractionTimer = 0;
            this.centerAttractionInterval = p.int(p.random(300, 600));
            const baseVideo = p.random(fishTextures);            // 隨機挑一支已 preload 的 video
            const vid = baseVideo.cloneNode(true);                // 複製出獨立元素
            vid.loop = true;
            vid.onloadedmetadata = () => {
                vid.currentTime = p.random(0, vid.duration);
            };
            //vid.playbackRate = p.random(0.9, 1.1);                // optional：稍微不同的播放速率
            vid.play();
            this.texture = vid;
            this.landed = false;
            this.landingTarget = null;
            this.landedTime = 0;
            this.depthLayer = p.int(p.random(0, 5)); // 0～4 共 5 層
            this.scaleFactor = p.map(this.depthLayer, 0, 4, 0.6, 1);

            this.pinned = false;
            this.pinOffset = p.createVector(0, 0);
        }

        update() {

            if (this.pinned && window.handKeypoints) {
                const hand = window.handKeypoints[0];
                const thumb = hand[4];
                const index = hand[8];
                const video = document.getElementById('input-video');
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;
                const mappedThumb = mapToCanvas(thumb.x, thumb.y, videoWidth, videoHeight);
                const mappedIndex = mapToCanvas(index.x, index.y, videoWidth, videoHeight);
                const midX = (mappedThumb.x + mappedIndex.x) / 2;
                const midY = (mappedThumb.y + mappedIndex.y) / 2;
                this.position.x = midX + this.pinOffset.x;
                this.position.y = midY + this.pinOffset.y;
                return;
            }


            if (this.landed && this.landingTarget) {
                this.position.x = p.lerp(this.position.x, this.landingTarget.x, 0.05);
                this.position.y = p.lerp(this.position.y, this.landingTarget.y, 0.05);
                return;
            }

            this.centerAttractionTimer++;
            if (this.centerAttractionTimer >= this.centerAttractionInterval) {
                let toCenter = p5.Vector.sub(p.createVector(p.width / 2, p.height / 2), this.position);
                this.targetAngle = toCenter.heading();
                this.centerAttractionTimer = 0;
            }

            if (p.frameCount % this.changeDirectionInterval === 0) {
                this.targetAngle = this.angle + p.random(-p.PI / 12, p.PI / 12);
                this.changeDirectionInterval = p.int(p.random(100, 300));
            }

            let boundary = 15;
            if (this.position.x > p.width - boundary || this.position.x < boundary ||
                this.position.y > p.height * 0.7 || this.position.y < boundary) {
                let toCenter = p5.Vector.sub(p.createVector(p.width / 2, p.height / 2), this.position);
                this.targetAngle = toCenter.heading();
                this.speed = this.baseSpeed;
            }

            this.angle = lerpAngle(this.angle, this.targetAngle, 0.01);
            let velocity = p.createVector(p.cos(this.angle), p.sin(this.angle)).mult(this.speed);
            this.position.add(velocity);

            if (this.position.y > p.height * 0.7) {
                this.position.y = p.height * 0.7;
                this.targetAngle = -p.HALF_PI;
            }
        }

        checkHandCollision() {
            const collisionThreshold = 50;
            const lowSpeedThreshold = 2;

            let collided = false;

            if (window.handKeypoints && window.handKeypointsSpeed) {
                const video = document.getElementById('input-video');
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;

                for (let handIndex = 0; handIndex < window.handKeypoints.length; handIndex++) {
                    const hand = window.handKeypoints[handIndex];
                    const handSpeed = window.handKeypointsSpeed[handIndex];

                    for (let kpIndex = 0; kpIndex < hand.length; kpIndex++) {
                        const kp = hand[kpIndex];
                        const speed = handSpeed[kpIndex];
                        const mapped = mapToCanvas(kp.x, kp.y, videoWidth, videoHeight);

                        let d = p.dist(this.position.x, this.position.y, mapped.x, mapped.y);
                        if (d < collisionThreshold) {
                            collided = true;

                            if (speed < lowSpeedThreshold) {
                                let offset = 30;
                                this.landingTarget = p.createVector(mapped.x, mapped.y - offset);
                                this.landed = true;
                                this.speed = 0;

                                // 記錄 landed 起始時間
                                if (this.landedTime === 0) {
                                    this.landedTime = Date.now();
                                }

                            } else {
                                this.landed = false;
                                this.landedTime = 0;
                                let escapeAngle = p.atan2(this.position.y - mapped.y, this.position.x - mapped.x);
                                this.targetAngle = escapeAngle;
                                this.speed = this.maxEscapeSpeed;
                            }
                            return;
                        }
                    }
                }
            }

            if (!collided) {
                this.landed = false;
                this.landedTime = 0;
                this.speed = p.lerp(this.speed, this.baseSpeed, 0.05);
            }
        }

        displayToLayer(ctx) {
            const angle = this.angle + Math.PI / 2;
            const offsetX = Math.cos(this.angle) * 20;
            const offsetY = Math.sin(this.angle) * 20;
            const x = this.position.x + offsetX;
            const y = this.position.y + offsetY;

            const fishSize = window.innerWidth * 0.05 * this.scaleFactor;

            // 改成 p.map（從外部作用域傳進來的 p）
            const alpha = p.map(this.depthLayer, 0, 4, 220, 255);

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.globalAlpha = alpha / 255;
            ctx.drawImage(this.texture, -fishSize / 2, -fishSize / 2, fishSize, fishSize);
            ctx.restore();
        }

    }

    function lerpAngle(start, end, amt) {
        let diff = (end - start + Math.PI) % (Math.PI * 2) - Math.PI;
        return start + diff * amt;
    }

    function mapToCanvas(x, y, videoWidth, videoHeight) {
        const canvasX = x / videoWidth * p.width;
        const canvasY = y / videoHeight * p.height;
        return { x: canvasX, y: canvasY };
    }

    function getPalmPolygonPoints(hand, videoWidth, videoHeight) {
        return palmPolygonIndices.map(index => {
            const kp = hand[index];
            return mapToCanvas(kp.x, kp.y, videoWidth, videoHeight);
        });
    }

    function drawLeafAlongPolygon(p, points, scaleFactor = 1) {
        for (let i = 0; i < points.length - 1; i++) {
            let p1 = points[i];
            let p2 = points[i + 1];
            let distance = p.dist(p1.x, p1.y, p2.x, p2.y);
            let count = p.int(distance / 15);

            for (let j = 0; j <= count; j++) {
                let t = j / count;
                let x = p.lerp(p1.x, p2.x, t);
                let y = p.lerp(p1.y, p2.y, t);
                let angle = p.atan2(p2.y - p1.y, p2.x - p1.x);

                p.push();
                p.translate(x, y);
                p.rotate(angle);
                p.imageMode(p.CENTER);
                let leafSize = p.random(28, 35) * scaleFactor;
                p.image(leafImage, 0, 0, leafSize, leafSize);
                p.pop();
            }
        }
    }

    function shrinkPolygon(points, amount) {
        let center = points.reduce((acc, pnt) => p.createVector(acc.x + pnt.x, acc.y + pnt.y), p.createVector(0, 0)).div(points.length);

        return points.map(pnt => {
            let dir = p.createVector(pnt.x - center.x, pnt.y - center.y);
            dir.setMag(dir.mag() - amount);
            return p.createVector(center.x + dir.x, center.y + dir.y);
        });
    }
});
