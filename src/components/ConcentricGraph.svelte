<script>
  import { onMount, setContext } from 'svelte'
  import cytoscape from 'cytoscape'
  import GraphStyles from './GraphStyles.js'
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  let refElement = null;
  let cyInstance = null;
  let tappedNode = null;

  setContext('graphSharedState', {
    getCyInstance: () => cyInstance
  })

  onMount(() => {
    cyInstance = cytoscape({
      container: refElement,
      elements: [],
      style: GraphStyles
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

  export function runConcentric(elements) {
    cyInstance.elements().remove();
    cyInstance.add(elements);

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