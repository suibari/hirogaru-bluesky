<script>
  import { onMount, setContext } from 'svelte'
  import cytoscape from 'cytoscape'
  import GraphStyles from './GraphStyles.js'
  import UserCard from './UserCard.svelte';

  export let elements;
  export let isRunning;
  let tappedNode;

  setContext('graphSharedState', {
    getCyInstance: () => cyInstance
  })

  let refElement = null;
  let cyInstance = null;

  onMount(() => {
    cyInstance = cytoscape({
      container: refElement,
      elements: [],
      style: GraphStyles
    })

    // カード表示
    cyInstance
      .on('tap', 'node', function(evt){
        tappedNode = evt.target;
        console.log( 'tapped ' + tappedNode.id() );
      });

    // カード非表示
    cyInstance
      .on('tap', function(evt){
        if (evt.target === cyInstance) {
          tappedNode = null;
          console.log( 'tap not node.' );
        }
      });
  })

  // elementsが変わったら実行される
  $: {
    if ((cyInstance) && (elements.length > 0)) { // onMountより先にここが実行されてエラーになるので防ぐ
      isRunning = true;
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
          stop: function() {
            isRunning = false;
          },
        })
        .run();
    };
  }
</script>

<div class="graph" bind:this={refElement}>
  {#if cyInstance}
    <slot></slot>
  {/if}
</div>

<!-- カード表示 -->
{#if tappedNode}
  <UserCard tappedNode={tappedNode} />
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