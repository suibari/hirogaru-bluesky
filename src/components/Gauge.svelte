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
        iconPath: 'heart.png',
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
    gauge.animationSpeed = 100;

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
    
    // document.getElementById('loading').style.display = 'none'; // くるくる表示終了

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
      gaugeMessage = true;
    }, 1000);
  });
</script>

<div id="gauge-container">
  <canvas class="gauge" bind:this={refElement}>
    {#if gauge}
      <slot></slot>
    {/if}
  </canvas>
  {#if gaugeMessage}
    <p>{biasText}{onesidedloveText}</p>
  {/if}
</div>

<style>
  #gauge-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  canvas {
    width: 400px;
    height: 400px;
  }
  p {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: x-large;
    width: 100%;
    text-align: center;
  }
</style>