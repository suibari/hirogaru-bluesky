<script>
  import { onMount } from "svelte";

  export let tappedNode;

  let histogram = [];
  let maxValue;
  let hours = Array.from({ length: 24 }, (_, i) => (i === 0 || i === 12 || i === 23) ? i : '');

  $: {
    if (tappedNode && tappedNode.data('activeHistgram')) {
      histogram = tappedNode.data('activeHistgram');
      maxValue = Math.max(...histogram);
    }
  }
</script>

<div class="histogram-container">
  {#each histogram as value, index}
    <div class="bar-container">
      <!-- ヒストグラムのバー -->
      <div 
        class="bar {value === maxValue ? 'max-bar' : ''}" 
        style="height: {maxValue ? (value / maxValue * 100) + '%' : '0%'};">
      </div>
      
      <!-- 各バーの値を表示 -->
      {#if hours[index] !== ''}
        <div class="label">{hours[index]}</div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .histogram-container {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 90%;
    margin-left: auto;
    margin-right: auto;
    height: 150px;
    padding-bottom: 20px;
    gap: 2px;
  }
  .bar-container {
    display: flex;
    flex-direction: column;
    justify-content: flex-end; /* 棒を下から描画 */
    align-items: center;
    width: calc(100% / 24); /* 24時間分で均等に幅を分配 */
    position: relative; /* 子要素の絶対位置を設定するため */
  }
  .bar {
    width: 100%;
    background-color: lightblue;
    transition: height 0.3s ease;
    border-radius: 4px 4px 0 0;
  }
  .label {
    text-align: center;
    margin-top: 5px;
    position: absolute;
    bottom: -25px; /* ラベルをバーの下に配置する */
  }
  .max-bar {
    background-color: #ff8a80 !important;
  }
</style>