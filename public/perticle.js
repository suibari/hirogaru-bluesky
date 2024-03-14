var particles = [];

function setup() {
  // p5.js
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  clear();
  for (var i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isFadedOut()) {
      particles.splice(i, 1); // パーティクルを削除
    }
  }
}

class Particle {
  constructor(x, y) {
    var minRadius = 8;
    var maxRadius = 50;
    var screenSize = min(windowWidth, windowHeight);
    var scaledRadius = map(screenSize, 0, 800, minRadius, maxRadius); // 画面サイズに応じて調整

    this.x = x;
    this.y = y;
    this.vx = random(-3, 3);
    this.vy = random(-3, 3);
    this.radius = random(scaledRadius*0.2, scaledRadius);
    this.opacity = random(40, 240);
    this.alpha = 240; // 初期の透明度

    this.update = function () {
      this.x += this.vx;
      this.y += this.vy;
      this.opacity -= 1; // 透明度を減少させる
    };

    this.display = function () {
      noStroke();
      fill(this.alpha, this.opacity);

      // ハート描画
      beginShape();
      vertex(this.x, this.y - this.radius * 0.8);
      bezierVertex(this.x + this.radius * 0.7, this.y - this.radius * 1.5, this.x + this.radius * 1.5, this.y - this.radius * 0.5, this.x, this.y + this.radius * 0.8);
      bezierVertex(this.x - this.radius * 1.5, this.y - this.radius * 0.5, this.x - this.radius * 0.7, this.y - this.radius * 1.5, this.x, this.y - this.radius * 0.8);
      endShape(CLOSE);
    };

    this.isFadedOut = function () {
      return this.opacity >= 255; // 透明度が255以上になったらtrueを返す
    };

    this.setPosition = function (x, y) {
      this.x = x;
      this.y = y;
    };
  }
}

// パーティクルの位置を更新する関数
function updateParticlePositions(newPosition) {
  if (newPosition) {
    for (var i = 0; i < particles.length; i++) {
      particles[i].setPosition(newPosition.x, newPosition.y);
    }
  }
}

// パーティクルを発生させる関数
function emitParticlesFromNode(position, engagement) {
  if (position && engagement > 0) {
    for (var i = 0; i < engagement; i++) {
      particles.push(new Particle(position.x, position.y));
    }
  }
}