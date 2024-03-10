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

function Particle(x, y) {
  this.x = x;
  this.y = y;
  this.vx = random(-3, 3);
  this.vy = random(-3, 3);
  this.radius = random(4, 30);
  this.opacity = random(40, 255);
  this.alpha = 240; // 初期の透明度

  this.update = function() {
    this.x += this.vx;
    this.y += this.vy;
    this.opacity -= 1; // 透明度を減少させる
  };

  this.display = function() {
    noStroke();
    fill(this.alpha, this.opacity);

    // ハート描画
    beginShape();
    vertex(this.x, this.y - this.radius * 0.8);
    bezierVertex(this.x + this.radius * 0.7, this.y - this.radius * 1.5, this.x + this.radius * 1.5, this.y - this.radius * 0.5, this.x, this.y + this.radius * 0.8);
    bezierVertex(this.x - this.radius * 1.5, this.y - this.radius * 0.5, this.x - this.radius * 0.7, this.y - this.radius * 1.5, this.x, this.y - this.radius * 0.8);
    endShape(CLOSE);
  };

  this.isFadedOut = function() {
    return this.alpha <= 0; // 透明度が0以下になったらtrueを返す
  };

  this.setPosition = function(x, y) {
    this.x = x;
    this.y = y;
  };
}

// パーティクルの位置を更新する関数
function updateParticlePositions(newPosition) {
  if (newPosition) {
    for (var i = 0; i < particles.length; i++) {
      particles[i].setPosition(newPosition.x, newPosition.y);
    }
  }
}
