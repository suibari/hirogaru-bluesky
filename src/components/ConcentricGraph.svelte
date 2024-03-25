<script>
  import { onMount, setContext } from 'svelte'
  import cytoscape from 'cytoscape'
  import GraphStyles from './GraphStyles.js'

  export let elements;

  setContext('graphSharedState', {
    getCyInstance: () => cyInstance
  })

  let refElement = null
  let cyInstance = null

  onMount(() => {
    cyInstance = cytoscape({
      container: refElement,
      elements: elements,
      style: GraphStyles
    })

    // cyInstance.on('add', () => {
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
        .run()
    // })
  })

</script>

<div class="graph" bind:this={refElement}>
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