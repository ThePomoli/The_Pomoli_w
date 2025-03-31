let myP5 = new p5((p) => {
    let fishArray = [];
    const numFish = 30;
    let fishTextures = [];
    let leafImage;
    let assetsLoaded = false;
    const palmPolygonIndices = [0, 1, 2, 3, 5, 9, 13, 17, 0];
    let whImageIndex = 9;
    let whTargetIndex = 9;
    let whChangeDelay = 300;
    let lastWhChangeTime = 0;


    p.preload = function () {
        let loadedCount = 0;
        const totalAssets = 30 + 1;

        for (let i = 1; i <= 30; i++) {
            p.loadImage(`./img/${i}.gif`,
                (img) => {
                    fishTextures.push(img);
                    loadedCount++;
                    if (loadedCount === totalAssets) {
                        assetsLoaded = true;
                    }
                },
                () => { console.warn(`魚圖載入失敗: ./img/${i}.gif`); }
            );
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
    
        // 設置 fishArray 和其他設定
        for (let i = 0; i < numFish; i++) {
            let pos;
            let attempts = 0;
            do {
                pos = p.createVector(p.random(p.width), p.random(p.height * 0.7));
                attempts++;
                if (attempts > 100) break;
            } while (isInHand(pos.x, pos.y));
            fishArray.push(new Fish(pos.x, pos.y));
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
        }

        for (let fish of fishArray) {
            fish.update();
            fish.checkHandCollision();
        }
        for (let fish of fishArray) {
            fish.display(p);
        }
        // 判斷是否有魚停在手上
        let hasLandedFish = fishArray.some(fish => fish.landed);
        whTargetIndex = hasLandedFish ? 1 : 9;

        // 換圖的動畫控制
        let now = Date.now();
        if (now - lastWhChangeTime > whChangeDelay) {
            if (whImageIndex !== whTargetIndex) {
                if (whImageIndex < whTargetIndex) {
                    whImageIndex++;
                } else {
                    whImageIndex--;
                }
                lastWhChangeTime = now;

                // 更新圖檔
                let whImg = document.querySelector('.wh img');
                whImg.src = `./img/wh${whImageIndex}.png`;
            }
        }

    };

    function isInHand(x, y) {
        if (!window.handKeypoints) return false;
        const handThreshold = 50;
        for (let hand of window.handKeypoints) {
            for (let kp of hand) {
                if (p.dist(x, y, kp.x, kp.y) < handThreshold) {
                    return true;
                }
            }
        }
        return false;
    }

    class Fish {
        constructor(x, y) {
            this.position = p.createVector(x, y);
            this.baseSpeed = p.random(0.5, 0.8);
            this.speed = this.baseSpeed;
            this.maxEscapeSpeed = 10;
            this.angle = p.random(p.TWO_PI);
            this.targetAngle = this.angle;
            this.changeDirectionInterval = p.int(p.random(100, 300));
            this.centerAttractionTimer = 0;
            this.centerAttractionInterval = p.int(p.random(300, 600));
            this.texture = p.random(fishTextures);
            this.landed = false;
            this.landingTarget = null;
        }

        update() {
            if (this.landed && this.landingTarget) {
                this.position.x = p.lerp(this.position.x, this.landingTarget.x, 0.1);
                this.position.y = p.lerp(this.position.y, this.landingTarget.y, 0.1);
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
                            if (speed < lowSpeedThreshold) {
                                let offset = 30;
                                this.landingTarget = p.createVector(mapped.x, mapped.y - offset);
                                this.landed = true;
                                this.speed = 0;
                            } else {
                                this.landed = false;
                                let escapeAngle = p.atan2(this.position.y - mapped.y, this.position.x - mapped.x);
                                this.targetAngle = escapeAngle;
                                this.speed = this.maxEscapeSpeed;
                            }
                            return;
                        }
                    }
                }
            }
            this.landed = false;
            this.speed = p.lerp(this.speed, this.baseSpeed, 0.05);
        }

        display(p) {
            p.push();
            p.translate(this.position.x, this.position.y);
            p.rotate(this.angle + p.HALF_PI);
            p.imageMode(p.CENTER);
            let offset = p.createVector(p.cos(this.angle) * 20, p.sin(this.angle) * 20);
            let headPosition = this.position.copy().add(offset);
            p.image(this.texture, headPosition.x - this.position.x, headPosition.y - this.position.y, window.innerWidth * 0.05, window.innerWidth * 0.05);
            p.pop();
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