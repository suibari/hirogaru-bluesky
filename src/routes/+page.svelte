<script>
  // external modules
  import 'svelte-material-ui/bare.css'
  import CircularProgress from '@smui/circular-progress';
  import { applyAction, deserialize } from '$app/forms';
  import Dialog, { Content, Header } from '@smui/dialog';
  import IconButton from "@smui/icon-button";
  import Tab, { Label } from "@smui/tab";
  import TabBar from "@smui/tab-bar";
  import { CameraPhotoSolid, QuestionCircleSolid } from 'flowbite-svelte-icons';
  // my components
  import Graph from "../components/Graph.svelte";
  import UserCard from "../components/UserCard.svelte";
  import ConfettiWrap from '../components/ConfettiWrap.svelte';
  import Usage from "../components/Usage.svelte";
  import About from "../components/About.svelte";
  import Specification from "../components/Specification.svelte";
  import ChangeLog from "../components/ChangeLog.svelte";
  import TitleLogo from "../components/TitleLogo.svelte";

  // export let form; // これがないとform actionを受け取れない
  let isNeverRun = true;
  let isRunning = false; // フェッチ&描画実行中のフラグ
  let tappedNode = null; // ノードタップフラグ
  let runConcentric; // 同心円相関図描画関数
  let runGrid; // 関係図描画関数
  let elements = [];
  let partnerElements = [];
  let position;
  let engagement;
  let displayConfetti;
  let captureGraph;
  let srcGraph;
  let isClickShare = false;
  let isClickHelp = false;
  let activeTab = "使い方";

  // ユーザカードの相関図ボタン用関数
  async function handleSubmit(event) {
    let body;

    isNeverRun = false;
    isRunning = true;

    if (event.currentTarget) {
      body = new FormData(event.currentTarget);
    } else {
      // formで呼ばれたわけではない
      body = new FormData();
      body.append("handle", event);
    }
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

    // パーティクル発生
    position = tappedNode.renderedPosition(); 
    engagement = tappedNode.data('engagement');
    displayConfetti(position.x, position.y, engagement);
  }

  // ノード以外のタップハンドラ
  function tapNotNode() {
    tappedNode = null;
  }

  // 関係分析ハンドラ
  async function doSocialAnalysis() {
    let body;

    isRunning = true;

    body = new FormData();
    body.append("handle", tappedNode.data('handle'));
    const response = await fetch('?/generate', {
      method: 'POST',
      body: body,
    });
    const result = deserialize(await response.text());
    if (result.type === 'success') {
      partnerElements = result.data.elements;
      runGrid(partnerElements);
    }
  }

  // シェアボタンハンドラ
  async function handleShare() {
    isRunning = true;
    
    const blob = await captureGraph();

    // サーバにblobを投げ合成してもらい、base64uriを受け取る
    let body = new FormData();
    console.log(`${blob.type}, ${blob.size} [Byte]`);
    body.append('image', blob, "image.png");
    const response = await fetch('?/upload', {
      method: 'POST',
      body: body,
    });
    const result = deserialize(await response.text());
    if (result.type === 'success') {
      srcGraph = result.data.uri;
      isClickShare = true;
    };
    isRunning = false;
  }
</script>

<form method="post" action="?/generate" on:submit|preventDefault={handleSubmit}>
  <input type="text" name="handle" autocomplete="off" placeholder="handle.bsky.social" />
  <button type="submit">Generate!</button>
</form>

<!-- タイトル -->
{#if isNeverRun}
  <TitleLogo/>
{/if}

<!-- Cytoscape -->
<Graph
  bind:runConcentric={runConcentric}
  bind:runGrid={runGrid}
  bind:captureGraph={captureGraph}
  on:stopRun={stopRun}
  on:tapNode={tapNode}
  on:tapNotNode={tapNotNode}>
</Graph>

<!-- パーティクル -->
<ConfettiWrap bind:displayConfetti={displayConfetti} />

<!-- カード表示 -->
{#if tappedNode !== null}
  <UserCard {tappedNode} {handleSubmit} on:doSocialAnalysis={doSocialAnalysis} />
{/if}

<!-- ローディングスピナー -->
{#if isRunning !== false}
  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
    <CircularProgress style="height: 60px; width: 60px;" indeterminate />
  </div>
{/if}

<!-- シェアボタン -->
<div id="shareButton">
  <IconButton on:click={() => handleShare()} class="material-icons">photo_camera</IconButton>
  <!-- <CameraPhotoSolid on:click={() => handleShare()} /> -->
</div>

<!-- ヘルプボタン -->
<div id="helpButton">
  <IconButton on:click={() => isClickHelp = true} class="material-icons">help</IconButton>
  <!-- <QuestionCircleSolid on:click={() => isClickHelp = true} /> -->
</div>

<!-- シェアモーダル -->
<Dialog
  bind:open={isClickShare}
  aria-describedby="share-message"
>
  <Header>
    <IconButton action="close" class="material-icons" style="float: right;">close</IconButton>
  </Header>
  <Content id="share-message">  
    <img id="share-image" src={srcGraph} alt="ひろがるBluesky相関図">
    <ol>
      <li>画像を右クリックかロングタップでコピーしてください</li>
      <li><a href="https://bsky.app/intent/compose?text=%23%E3%81%B2%E3%82%8D%E3%81%8C%E3%82%8BBluesky" target="_blank">こちら</a>をクリックして、開いたポスト画面に画像をペーストしてシェア！</li>
    </ol>
  </Content>
</Dialog>

<!-- ヘルプモーダル -->
<Dialog
  bind:open={isClickHelp}
  fullscreen
  aria-labelledby="helptitle"
  aria-describedby="helpmessage"
>
  <Header>
    <TabBar tabs={['使い方', '当サイトについて', '詳細仕様', '変更履歴']} let:tab bind:active={activeTab}>
      <Tab {tab}>
        <Label>{tab}</Label>
      </Tab>
    </TabBar>
    <IconButton action="close" class="material-icons" style="float: right;">close</IconButton>
  </Header>
  <Content>
    {#if activeTab === "使い方"}
      <Usage/>
    {:else if activeTab === "当サイトについて"}
      <About/>
    {:else if activeTab === "詳細仕様"}
      <Specification/>
    {:else if activeTab === "変更履歴"}
      <ChangeLog/>
    {/if}
  </Content>
</Dialog>

<style>
  form {
    margin-top: 8px;
    margin-left: 8px;
    position: relative;
    z-index: 1;
  }
  #shareButton {
    position: fixed;
    top: 8px;
    right: 8px;
    width: 50px;
    height: 50px;
    color: white;
    cursor: pointer;
    z-index: 2;
  }
  #share-image {
    max-width: 100%;
    height: auto;
  }
  #helpButton {
    position: fixed;
    bottom: 8px;
    right: 8px;
    width: 50px;
    height: 50px;
    color: white;
    cursor: pointer;
  }
</style>
