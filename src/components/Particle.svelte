<script>
  import P5 from 'p5-svelte';

  let particles = [];

  const sketch = (p5) => {
    p5.setup = () => {
      p5.createCanvas(window.innerWidth, window.innerHeight);
    };

    p5.draw = () => {
      p5.clear();
      for (var i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].display();
        if (particles[i].isFadedOut()) {
          particles.splice(i, 1); // パーティクルを削除
        }
      }
    };
  };

  class Particle {
    constructor(x, y) {
      const minRadius = 8;
      const maxRadius = 50;
      const screenSize = Math.min(window.innerWidth, window.innerHeight);
      const scaledRadius = map(screenSize, 0, 800, minRadius, maxRadius); // 画面サイズに応じて調整

      this.x = x;
      this.y = y;
      this.vx = Math.random(-3, 3);
      this.vy = Math.random(-3, 3);
      this.radius = Math.random(scaledRadius*0.2, scaledRadius);
      this.opacity = Math.random(40, 255);
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
        return this.opacity <= 0; // 透明度が0以下になったらtrueを返す
      };

      this.setPosition = function (x, y) {
        this.x = x;
        this.y = y;
      };
    }
  }

  function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
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
  export function emitParticlesFromNode(position, engagement) {
    if (position && engagement > 0) {
      for (var i = 0; i < engagement; i++) {
        particles.push(new Particle(position.x, position.y));
      }
    }
  }
</script>

<P5 {sketch} />