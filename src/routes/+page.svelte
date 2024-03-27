<script>
  import ConcentricGraph from "../components/ConcentricGraph.svelte";
  import 'svelte-material-ui/bare.css'
  import CircularProgress from '@smui/circular-progress';
  import UserCard from "../components/UserCard.svelte";
	import { invalidateAll, goto } from '$app/navigation';
	import { applyAction, deserialize } from '$app/forms';

  // export let form; // これがないとform actionを受け取れない
  let isRunning = false; // フェッチ&描画実行中のフラグ
  let tappedNode = null; // ノードタップフラグ
  let runConcentric; // 同心円相関図描画関数
  let elements = [];
  // if (form) {
  //   elements = form.elements;
  // }

  // ユーザカードの相関図ボタン用関数
  async function handleSubmit(event) {
    isRunning = true;

    const body = new FormData(event.currentTarget);
    // body.append("handle", handle);
    const response = await fetch('?/generate', {
      method: 'POST',
      body: body,
    });
    const result = deserialize(await response.text());
    if (result.type === 'success') {
      // await invalidateAll();
      elements = result.data.elements;

      runConcentric(elements);
    }
    applyAction(result); // formへのresult格納
  }

  // 描画停止ハンドラ
  function stopRun() {
    isRunning = false;
  }

  // タップハンドラ
  function tapNode(event) {
    tappedNode = event.detail;
  }
</script>

<form method="post" action="?/generate" on:submit|preventDefault={handleSubmit}>
  <input type="text" name="handle" autocomplete="off" placeholder="handle.bsky.social" />
  <button type="submit">Generate!</button>
</form>

<!-- Cytoscape -->
<ConcentricGraph bind:runConcentric={runConcentric} on:stopRun={stopRun} on:tapNode={tapNode} />

<!-- カード表示 -->
{#if tappedNode !== null}
  <UserCard {tappedNode} {handleSubmit} />
{/if}

<!-- ローディングスピナー -->
{#if isRunning !== false}
  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
    <CircularProgress style="height: 60px; width: 60px;" indeterminate />
  </div>
{/if}

<style>
  form {
    margin-top: 8px;
    margin-left: 8px;
    position: relative;
    z-index: 1;
  }
</style>
