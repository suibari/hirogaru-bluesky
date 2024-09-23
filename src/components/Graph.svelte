<script>
  import { onMount, setContext } from 'svelte'
  import cytoscape from 'cytoscape'
  import GraphStylesConcentric from './GraphStylesConcentric.js'
  import { createEventDispatcher } from 'svelte';
  export let selectedRadius;
  const dispatch = createEventDispatcher();
  
  let refElement = null;
  let cyInstance = null;
  let tappedNode = null;
  let edgeToPartner;
  let edgeFromPartner;
  let formerNodeWidth, formerNodeHeight;  
  
  setContext('graphSharedState', {
    getCyInstance: () => cyInstance
  })

  onMount(() => {
    cyInstance = cytoscape({
      container: refElement,
      elements: [],
      userZoomingEnabled: true,
    });

    // カード表示
    cyInstance
    .on('tap', 'node', function(evt){
      tappedNode = evt.target;
      // console.log( 'tapped ' + tappedNode.id() );
      dispatch('tapNode', tappedNode);
    });

    // カード非表示
    cyInstance
    .on('tap', function(evt){
      if (evt.target === cyInstance) {
        tappedNode = null;
        // console.log( 'tap not node.' );
        dispatch('tapNotNode');
      }
    });
  });

  // ---------------------
  // 同心円グラフ描画
  // ---------------------
  export function runConcentric(elements, isNodeStable) {
    if (!isNodeStable) {
      cyInstance.elements().remove();
    }

    cyInstance.add(elements);

    // 表示しきい値算出
    const maxLevel = elements.reduce((max, obj) => {
      return obj.data.level > max ? obj.data.level : max;
    }, -Infinity);
    const thrdLevel = maxLevel - selectedRadius;

    // しきい値以下のnodesを非表示
    cyInstance.nodes().forEach(node => {
      if (node.data('level') <= thrdLevel) {
        node.hide();
      } else {
        node.show();
      }
    });

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