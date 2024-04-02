<script>
  import { onMount } from "svelte";

  export let edgeToPartner;
  export let edgeFromPartner;
  let refElement;
  let gauge;
  let gaugeMessage = false;
  let biasText = "";
  let onesidedloveText = "";

  onMount(async () => {
    (await import('https://bernii.github.io/gauge.js/dist/gauge.min.js')).default

    // ゲージ作成
    gauge = new Gauge(refElement).setOptions({
      angle: -0.35,
      lineWidth: 0.05,
      radiusScale: 0.5,
      pointer: {
        strokeWidth: 0,
        iconPath: 'img/heart.png',
        iconScale: 0.05,
      },
      limitMin: true, // Minimum value
      limitMax: true, // Maximum value
      colorStart: '#F48FFF',
      colorStop: '#FFD8FB',
      strokeColor: '#EEEEEE',
      generateGradient: true,
      highDpiSupport: true,
    });
    gauge.maxValue = 100;
    gauge.setMinValue(0);
    gauge.animationSpeed = 5; // canvasに文字描画する場合5以下にしないと

    // エンゲージメントを取得
    const engToPartner = edgeToPartner.data('rawEngagement');
    const engToPartnerClipped = engToPartner > 0 ? engToPartner : 0;
    const engFromPartner = edgeFromPartner.data('rawEngagement');
    const engFromPartnerClipped = engFromPartner > 0 ? engFromPartner : 0;
    const minEngagement = Math.min(engToPartnerClipped, engFromPartnerClipped);
    const maxEngagement = Math.max(engToPartnerClipped, engFromPartnerClipped);
    const onesidedloveValue = (minEngagement / maxEngagement);
    const biasEngagement = (maxEngagement > 500) ? 50 : maxEngagement / 10;
    const socialvalue = (onesidedloveValue * 50) + biasEngagement;

    // ゲージ描画
    gauge.set(socialvalue);
    
    // 1秒後にメッセージ描画
    if (!maxEngagement) {
      onesidedloveText = "今後に期待";
    } else if (onesidedloveValue < 0.5) {
      onesidedloveText = "片思い";
    } else {
      onesidedloveText = "相思相愛";
    };
    if (!biasEngagement) {
      biasText = "まだまだ";
    } else if (biasEngagement <= 20) {
      biasText = "みがけば光る";
    } else if (biasEngagement < 50) {
      biasText = "最近話題の";
    } else {
      biasText = "Bluesky中にとどろく";
    }
    setTimeout(function() {
      // テキスト要素で文字描画
      gaugeMessage = true;

      // canvasで中央に文字描画
      // const canvas = document.getElementById('gauge');
      // const ctx = canvas.getContext('2d');

      // const text = biasText + onesidedloveText;
      // const fontsize = 24;

      // ctx.beginPath();
      // ctx.font = `${fontsize}px Roboto medium`;
      // const textWidth = ctx.measureText(text).width;
      // const x = (canvas.width - textWidth) / 2;
      // const y = (canvas.height + fontsize) / 2;
      // ctx.fillText(text, x, y);
    }, 500);
  });
</script>

<canvas id="gauge" bind:this={refElement}>
  {#if gauge}
    <slot></slot>
  {/if}
</canvas>
{#if gaugeMessage}
  <p>{biasText}{onesidedloveText}</p>
{/if}

<style>
  #gauge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    height: 400px;
    pointer-events: none;
  }
  p {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: x-large;
    width: 100%;
    text-align: center;
    pointer-events: none;
  }
</style>