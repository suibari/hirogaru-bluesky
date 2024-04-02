<script>
  import { onMount, setContext } from 'svelte'
  import cytoscape from 'cytoscape'
  import GraphStylesConcentric from './GraphStylesConcentric.js'
  import Gauge from './Gauge.svelte';
  import { createEventDispatcher } from 'svelte';
    import { createImageData } from 'canvas';
  const dispatch = createEventDispatcher();
  
  let refElement = null;
  let cyInstance = null;
  let tappedNode = null;
  let edgeToPartner;
  let edgeFromPartner;
  let isGauge = false;
  let formerNodeWidth, formerNodeHeight;  
  
  setContext('graphSharedState', {
    getCyInstance: () => cyInstance
  })

  onMount(() => {
    cyInstance = cytoscape({
      container: refElement,
      elements: [],
      userZoomingEnabled: false,
    });

    // カード表示
    cyInstance
    .on('tap', 'node', function(evt){
      tappedNode = evt.target;
      console.log( 'tapped ' + tappedNode.id() );
      dispatch('tapNode', tappedNode);
    });

    // カード非表示
    cyInstance
    .on('tap', function(evt){
      if (evt.target === cyInstance) {
        tappedNode = null;
        console.log( 'tap not node.' );
        dispatch('tapNotNode');
      }
    });
  });

  // ---------------------
  // 同心円グラフ描画
  // ---------------------
  export function runConcentric(elements) {
    isGauge = false;

    cyInstance.elements().remove();
    cyInstance.add(elements);

    cyInstance.style(GraphStylesConcentric);
    cyInstance
      .layout({
        name: 'concentric',
        animate: true,
        padding: 10,
        startAngle: Math.PI * 2 * Math.random(), // ノードの開始位置を360度ランダムに
        concentric: node => {
          return node.data('level');
        },
        levelWidth: () => {
          return 1;
        },
      })
      .run();

    dispatch('stopRun');

    // マウスオーバーノード拡大
    cyInstance
    .on('mouseover', 'node', (event) => {
      const node = event.target;
      formerNodeWidth = node.width();
      formerNodeHeight = node.height();
      node.stop();
      node.animate({
        style: {
          width: '80px',
          height: '80px',
        },
        duration: 100,
      });
    });

    // マウスアウトノード縮小
    cyInstance
    .on('mouseout', 'node', (event) => {
      const node = event.target;
      node.stop();
      node.animate({
        style: {
          width: `${formerNodeWidth}px`,
          height: `${formerNodeHeight}px`,
        },
        duration: 50,
      });
    });
  }

  // ---------------------
  // 関係図描画
  // ---------------------
  export function runGrid(partnerElements, partnerNode) {
    isGauge = false;
    cyInstance.removeListener('mouseover', 'node');
    cyInstance.removeListener('mouseout', 'node');

    // 中心ノード取得
    let centerNode = cyInstance.nodes().filter(node => {
      return node.data('level') === 5;
    });

    // 相手から自分のedge取得(まずオブジェクトを取得し、その次にedgeプロトタイプを取得)
    let edgeFromPartnerObj = partnerElements.filter(d => {
      return (d.group === 'edges') && (d.data.target === centerNode.id());
    });
    cyInstance.add(edgeFromPartnerObj);
    edgeFromPartner = cyInstance.edges().filter(function(edge) {
      return edge.data('source') === partnerNode.id() && edge.data('target') === centerNode.id();
    });

    // 自分から相手のedge取得
    edgeToPartner = cyInstance.edges().filter(function(edge) {
      return edge.data('source') === centerNode.id() && edge.data('target') === partnerNode.id();
    });

    // 自分と相手の間だけのedgeを表示、それ以外非表示
    cyInstance.edges().forEach(edge => {
      if (edge.source().id() === partnerNode.id() && edge.target().id() === centerNode.id()) {
        edge.style('display', 'element'); // タップされたノードから中心ノードへのエッジ
      } else if (edge.source().id() === centerNode.id() && edge.target().id() === partnerNode.id()) {
        edge.style('display', 'element'); // 中心ノードからタップされたノードへのエッジ
      } else {
        edge.style('display', 'none'); // それ以外のエッジは非表示
      }
    });

    // タップノードと中心ノード以外のnode削除
    cyInstance.nodes().forEach(node => {
      if (node.id() !== partnerNode.id() && node.id() !== centerNode.id()) {
        node.remove();
      }
    });

    // nodeサイズ設定
    //   こっちの書き方じゃないとmouseover/outイベントと競合するみたい…
    cyInstance.nodes().forEach(node => {
      node.style({
        width: '150px',
        height: '150px',
      });
    });
    // cyInstance.style().selector('node').style({
    //   'width': '150px',
    //   'height': '150px',
    // }).update(); // スタイルの更新

    // レイアウト適用
    cyInstance.layout({ 
      name: 'grid',
      padding: 100,
    }).run();
    dispatch('stopRun');

    // ゲージ表示
    isGauge = true;

    dispatch('finishGrid');
  }

  // ---------------------
  // 画面キャプチャ
  // ---------------------
  export async function captureConcentric() {
    // アイコンサイズ一定モード切り替え

    // 背景色
    const randomColor = generateRandomColor();

    const blob = await cyInstance.png({
      output: "blob",
      bg: randomColor,
      full: true,
      maxWidth: 750,
      maxHeight: 750,
    });

    return blob;
  }

  export async function captureGrid() {
    // 背景色
    const randomColor = generateRandomColor();

    const graphContext = await cyInstance.png({
      output: "base64uri",
      bg: randomColor,
      full: false,
      maxWidth: 750,
      maxHeight: 750,
    });

    const gauge = document.getElementById('gauge');
    const gaugeContext = gauge.toDataURL();

    return new Promise(async (resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = cyInstance.width();
      canvas.height = cyInstance.height();
      const ctx = canvas.getContext('2d');
      ctx.drawImage(await createImage(graphContext), 0, 0, cyInstance.width(), cyInstance.height());
      ctx.drawImage(await createImage(gaugeContext), cyInstance.width()/2 - 400/2, cyInstance.height()/2 - 400/2, 400, 400);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }

  // ランダムな背景色を生成する関数
  function generateRandomColor() {
    var hue = Math.floor(Math.random() * 360); // 色相をランダムに選択（0から359）
    var saturation = Math.floor(Math.random() * 31) + 60; // 彩度を60から90の間でランダムに選択
    var lightness = Math.floor(Math.random() * 21) + 60; // 明度を40から80の間でランダムに選択
    return 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)'; // HSLカラーモデルで色を返す
  }

  function createImage(context) {
    return new Promise((resolve, reject) => {
      let image = new Image;
      image.src = context;
      image.onload = () => resolve(image);
    });
  }

  function convertUriToBlob(dataUri) {
    const byteString = atob(dataUri.split(',')[1]);
    const mimeType = dataUri.match(/:([a-z\/\-]+);/)[1];

    let buffer = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
  	  buffer[i] = byteString.charCodeAt(i);
    }
    return new Blob([buffer], {type: mimeType});
  }
</script>

<div id="cy" class="graph" bind:this={refElement}>
  {#if cyInstance}
    <slot></slot>
  {/if}
</div>

{#if isGauge}
  <Gauge {edgeToPartner} {edgeFromPartner} />
{/if}

<style>
  .graph {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    position: fixed;
    z-index: 0;
  }
</style>