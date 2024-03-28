<script>
  import { onMount, setContext } from 'svelte'
  import cytoscape from 'cytoscape'
  import GraphStyles from './GraphStyles.js'
  import Gauge from './Gauge.svelte';
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  let refElement = null;
  let cyInstance = null;
  let tappedNode = null;
  let edgeToPartner;
  let edgeFromPartner;
  let isGauge = false;
  
  setContext('graphSharedState', {
    getCyInstance: () => cyInstance
  })

  onMount(() => {
    cyInstance = cytoscape({
      container: refElement,
      elements: [],
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
        dispatch('tapNode', tappedNode);
      }
    });
  });

  // 同心円グラフ描画
  export function runConcentric(elements) {
    isGauge = false;

    cyInstance.elements().remove();
    cyInstance.add(elements);

    cyInstance.style(GraphStyles);
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
        stop: () => {
          dispatch('stopRun');
        },
      })
      .run();
  }

  // 関係図描画
  export function runGrid(partnerElements) {
    isGauge = false;

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
      return edge.data('source') === tappedNode.id() && edge.data('target') === centerNode.id();
    });

    // 自分から相手のedge取得
    edgeToPartner = cyInstance.edges().filter(function(edge) {
      return edge.data('source') === centerNode.id() && edge.data('target') === tappedNode.id();
    });

    // 自分と相手の間だけのedgeを表示、それ以外非表示
    cyInstance.edges().forEach(edge => {
      if (edge.source().id() === tappedNode.id() && edge.target().id() === centerNode.id()) {
        edge.style('display', 'element'); // タップされたノードから中心ノードへのエッジ
      } else if (edge.source().id() === centerNode.id() && edge.target().id() === tappedNode.id()) {
        edge.style('display', 'element'); // 中心ノードからタップされたノードへのエッジ
      } else {
        edge.style('display', 'none'); // それ以外のエッジは非表示
      }
    });

    // タップノードと中心ノード以外のnode削除
    cyInstance.nodes().forEach(node => {
      if (node.id() !== tappedNode.id() && node.id() !== centerNode.id()) {
        node.remove();
      }
    });

    // nodeサイズ設定
    cyInstance.style().selector('node').style({
      'width': 150,
      'height': 150
    }).update(); // スタイルの更新

    // レイアウト適用
    cyInstance.layout({ 
      name: 'grid',
      padding: 100,
      stop: () => {
        dispatch('stopRun');
      },
    }).run();

    // ゲージ表示
    isGauge = true;
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