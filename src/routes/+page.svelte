<script>
  // Sveltekit modules
  import { applyAction, deserialize } from '$app/forms';
  import { browser } from '$app/environment';
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  // external modules
  import 'svelte-material-ui/bare.css'
  import CircularProgress from '@smui/circular-progress';
  import Dialog, { Content, Header } from '@smui/dialog';
  import IconButton from "@smui/icon-button";
  import Tab, { Label } from "@smui/tab";
  import TabBar from "@smui/tab-bar";
  import Snackbar, {Actions} from '@smui/snackbar';
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
  let captureConcentric, captureGrid;
  let srcGraph;
  let isClickShare = false;
  let isClickHelp = false;
  let activeTab = "使い方";
  let snackbarWarningRunning, snackbarWarningNeverRun, snackbarErrorFetch;
  let inputHandle = writable('');
  let errorMessage;
  let isGridMode = false;
  let selectedRadius;

  // ページ読み込み時ローカルストレージのハンドルをセット
  onMount(() => {
    const storedValue = localStorage.getItem('handle');
    if (storedValue) {
      inputHandle.set(storedValue);
    }
  })

  // ユーザカードの相関図ボタン用関数
  async function handleSubmit(event) {
    if (isRunning) {
      snackbarWarningRunning.open();

    } else {
      let body;

      isNeverRun = false;
      isRunning = true;
      isGridMode = false;

      if (event.currentTarget) {
        body = new FormData(event.currentTarget);

        // ローカルストレージに保存
        localStorage.setItem("handle", body.get('handle'));
      } else {
        // formで呼ばれたわけではない、eventにhandleが設定されているはず
        body = new FormData();
        body.append("handle", event);
      }
      const response = await fetch('?/generate', {
        method: 'POST',
        body: body,
      });

      if (response.ok) {
        const result = deserialize(await response.text());
        if (result.type === 'success') {
          // await invalidateAll();
          elements = result.data.elements;
          runConcentric(elements);
        };
        // applyAction(result); // formへのresult格納
      } else {
        const json = await response.json();
        errorMessage = json.error.message;
        snackbarErrorFetch.open();
        isRunning = false;
      }
    };
  }

  // 相関図半径のセレクトボックス選択肢生成
  function getOptions() {
    if (isNeverRun) {
      return [4]; // isNeverRunがtrueの場合、3のみ表示
    } else {
      options = [];
      const maxLevel = elements.reduce((max, obj) => {
        return obj.data.level > max ? obj.data.level : max;
      }, -Infinity);
      // 数式に基づいてオプションを追加
      for (let i = 2; i <= maxLevel; i++) {
        options.push(i);
      }
    }

    return options;
  }

  // `elements`または`isNeverRun`が変更されたときに`options`を再計算
  $: options = getOptions(elements); // elements引数は使わないが、ないとreactive statementsが動かない

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
    if (isRunning) {
      snackbarWarningRunning.open();

    } else {
      let body;
      const partnerNode = tappedNode;

      isRunning = true;

      body = new FormData();
      body.append("handle", partnerNode.data('handle'));
      const response = await fetch('?/generate', {
        method: 'POST',
        body: body,
      });

      if (response.ok) {
        const result = deserialize(await response.text());
        if (result.type === 'success') {
          // console.log("debug!")

          partnerElements = result.data.elements;
          runGrid(partnerElements, partnerNode);
        }
      } else {
        const json = await response.json();
        errorMessage = json.error.message;
        snackbarErrorFetch.open();
        isRunning = false;
      };     
    };
  }

  function finishGrid() {
    isGridMode = true;
  }

  function backConcentric(event) {
    const handle = event.detail;
    const centerNode = elements.filter(obj => obj.data.level === 5);

    if (centerNode[0].data.handle === handle) {
      // 自分が選択された
      runConcentric(elements);
      isGridMode = false;
    } else {
      // 相手が選択された
      runConcentric(partnerElements);
      isGridMode = false;
    };
  }

  // シェアボタンハンドラ
  async function handleShare() {
    if (isRunning) {
      snackbarWarningRunning.open();

    } else if (isNeverRun) {
      snackbarWarningNeverRun.open();

    } else {
      let blob;

      isRunning = true;
      
      if (isGridMode) {
        blob = await captureGrid();
      } else {
        blob = await captureConcentric();
      };

      // サーバにblobを投げ合成してもらい、base64uriを受け取る
      let body = new FormData();
      // console.log(`${blob.type}, ${blob.size} [Byte]`);
      body.append('image', blob, "image.png");
      const response = await fetch('?/upload', {
        method: 'POST',
        body: body,
      });
      
      if (response.ok) {
        const result = deserialize(await response.text());
        if (result.type === 'success') {
          srcGraph = result.data.uri;
          isClickShare = true;
        };
        isRunning = false;
      } else {
        const json = await response.json();
        errorMessage = json.error.message;
        snackbarErrorFetch.open();
        isRunning = false;
      };
    };
  }
</script>

<!-- フォーム -->
<form method="post" action="?/generate" on:submit|preventDefault={handleSubmit}>
  <input type="text" name="handle" autocomplete="off" placeholder="handle.bsky.social" bind:value={$inputHandle} />
  <button type="submit">Generate!</button>
</form>
<div id="selectRadius">半径
  <select
    bind:value={selectedRadius}
    on:change={() => runConcentric(elements)}
    disabled={isRunning||isNeverRun} >
    {#each options as option}
      <option value={option} selected={option == selectedRadius}>{option}</option>
    {/each}
  </select>
</div>
<!-- フェッチエラー -->
<Snackbar bind:this={snackbarErrorFetch}>
  <Label>エラーが発生しました: {errorMessage}</Label>
  <Actions>
    <IconButton class="material-icons" title="Dismiss">close</IconButton>
  </Actions>
</Snackbar>

<!-- タイトル -->
{#if isNeverRun}
  <TitleLogo/>
{/if}

<!-- Cytoscape -->
<Graph
  bind:runConcentric={runConcentric}
  bind:runGrid={runGrid}
  bind:captureConcentric={captureConcentric}
  bind:captureGrid={captureGrid}
  selectedRadius={selectedRadius}
  on:stopRun={stopRun}
  on:tapNode={tapNode}
  on:tapNotNode={tapNotNode}
  on:finishGrid={finishGrid} />

<!-- パーティクル -->
<ConfettiWrap bind:displayConfetti={displayConfetti} />

<!-- カード表示 -->
{#if tappedNode !== null}
  <UserCard
    {tappedNode}
    {handleSubmit}
    {isGridMode}
    on:doSocialAnalysis={doSocialAnalysis}
    on:backConcentric={backConcentric} />
{/if}

<!-- ローディングスピナー -->
{#if isRunning !== false}
  <div id="loadingSpinner">
    <CircularProgress style="height: 100px; width: 100px;" indeterminate />
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
      <li><a href="https://bsky.app/intent/compose?text=%23%E3%81%B2%E3%82%8D%E3%81%8C%E3%82%8BBluesky%0D%0Ahttps%3A%2F%2Fhirogaru-bluesky.vercel.app%2F%0D%0A" target="_blank">こちら</a>をクリックして、開いたポスト画面に画像をペーストしてシェア！</li>
    </ol>
  </Content>
</Dialog>
<!-- シェアエラー -->
<Snackbar bind:this={snackbarWarningRunning}>
  <Label>グラフ生成中です</Label>
  <Actions>
    <IconButton class="material-icons" title="Dismiss">close</IconButton>
  </Actions>
</Snackbar>
<Snackbar bind:this={snackbarWarningNeverRun}>
  <Label>相関図を生成してください</Label>
  <Actions>
    <IconButton class="material-icons" title="Dismiss">close</IconButton>
  </Actions>
</Snackbar>

<!-- ヘルプモーダル -->
<div id="helpModal">
  <Dialog
    bind:open={isClickHelp}
    fullscreen
    aria-labelledby="helptitle"
    aria-describedby="helpmessage"
  >
    <Header>
      <TabBar tabs={['使い方', '当サイトについて', '変更履歴']} let:tab bind:active={activeTab}>
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
</div>

<style>
  form {
    margin-top: 16px;
    margin-left: 8px;
    position: relative;
    z-index: 1;
  }
  #selectRadius {
    margin-top: 8px; /* フォームとセレクトボックスの間のスペースを調整 */
    margin-left: 8px; /* フォームの左マージンと揃える */
    position: relative;
    z-index: 1; /* フォームと同じz-indexを持たせる（必要なら調整） */
  }
  @media screen and (max-width: 600px) {
    form button {
      margin-top: 10px;
      display: block;
    }
  }
  #loadingSpinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 3;
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
  #helpModal {
    z-index: 10;
  }
</style>
