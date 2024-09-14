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
  import Button from '@smui/button';
  import { Progressbar } from 'flowbite-svelte';
  import { sineOut } from 'svelte/easing';
  // my components
  import Graph from "../components/Graph.svelte";
  import UserCard from "../components/UserCard.svelte";
  import ConfettiWrap from '../components/ConfettiWrap.svelte';
  import Usage from "../components/Usage.svelte";
  import About from "../components/About.svelte";
  import Specification from "../components/Specification.svelte";
  import ChangeLog from "../components/ChangeLog.svelte";
  import TitleLogo from "../components/TitleLogo.svelte";
  import ShareModal from '../components/ShareModal.svelte';

  // export let form; // これがないとform actionを受け取れない
  let isNeverRun = true;
  let isRunning = false; // フェッチ&描画実行中のフラグ
  let isPosting = false; // ポスト中のフラグ
  let isGenerating = false;
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
  let isShowSuggestion = false;
  let isLoginModalOpen = false;
  let isGridMode = false;
  let activeTab = "使い方";
  let snackbarWarningRunning, snackbarWarningNeverRun, snackbarErrorFetch, snackbarSuccess, snackbarWarningPosting;
  let inputHandle = writable('');
  let suggestions = writable([]);
  let debounceTimeout;
  let errorMessage, successMessage = "";
  let selectedRadius;
  let handle, password;
  let isLoggedIn = false;
  let progressGenerate = 0;
  export let data;

  // ページ読み込み時の処理
  // リロード時にサーバからログイン状態を貰う
  isLoggedIn = data.isLoggedIn;

  // ページレンダリング後の処理
  onMount(() => {
    // ページ読み込み時ローカルストレージのハンドルをセット
    const storedValue = localStorage.getItem('handle');
    if (storedValue) {
      inputHandle.set(storedValue);
    }

    // サジェスト欄のイベントリスナーセット
    document.addEventListener('click', closeSuggestions);

    // コンポーネントが破棄されるときにイベントリスナーを削除
    return () => {
      document.removeEventListener('click', closeSuggestions);
    };
  })

  // ユーザカードの相関図ボタン用ハンドラ
  async function handleSubmit(event) {
    if (isGenerating) {
      snackbarWarningRunning.open();

    } else {
      // Google Analytics にイベントを送信
      gtag('event', 'generate_graph', {
        'event_category': 'button_click',
        'event_label': 'Generate Button',
        'value': 1 // 任意の値。必要に応じて変更可能
      });

      let body;

      isNeverRun = false;
      isGenerating = true;
      isGridMode = false;
      isShowSuggestion = false;

      if ((event) && (event.currentTarget)) {
        body = new FormData(event.currentTarget);

      } else {
        // formで呼ばれたわけではない、eventにhandleが設定されているはず
        body = new FormData();
        body.append("handle", event);
      }

      // サーバーとの通信をEventSourceに変更して進捗を受け取る
      const url = new URL('/generate', window.location.origin);
      const searchParams = new URLSearchParams(body);
      url.search = searchParams.toString();

      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.progress) {
          progressGenerate = data.progress;
          console.log(`progress: ${data.progress}`);
        } else if (data.success) {
          elements = data.elements;
          const isFirstTime = data.isFirstTime;
          if (isFirstTime) {
            successMessage = "初回実行なので取得データ数を減らして実行します。数分後にデータ更新されますので、また実行してみてください!";
            snackbarSuccess.open();
          }
          runConcentric(elements);

          // ローカルストレージに保存
          localStorage.setItem("handle", body.get('handle'));

          // 裏でinngestに更新リクエスト
          const response = fetch('?/update', {
            method: 'POST',
            body: body,
          });

          isGenerating = false;
          eventSource.close();
        }
      };

      eventSource.onerror = (event) => {
        errorMessage = event;
        snackbarErrorFetch.open();
        isGenerating = false;
      }
    }
  }

  // ハンドル名入力時のハンドラ
  async function handleInput(event) {
    const value = event.target.value;
    const form = event.target.form;

    // デバウンス: 一定時間入力が止まったらリクエストを送る
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(async () => {
      if (value.length > 0) {
        const body = new FormData(form);
        const response = await fetch('?/search', {
          method: 'POST',
          body: body,
        });
        if (response.ok) {
          const result = deserialize(await response.text());
          if (result.type === 'success') {
            const results = result.data.searchResult;
            suggestions = results.slice(0, 5);
            isShowSuggestion = true;
          }
        }
      } else {
        isShowSuggestion = false;
      }
    }, 300); // 300msデバウンス
  }

  // サジェスト欄クリック時のハンドラ
  function handleSuggestionClick(suggestion) {
    inputHandle.set(suggestion.handle);
    handleSubmit(suggestion.handle);
  }

  // サジェスト欄クローズのハンドラ
  function closeSuggestions(event) {
    const isClickInputOrSuggestion = event.target.closest('input', '.suggestion-box');
    if (!isClickInputOrSuggestion) {
      isShowSuggestion = false;
    }
  }

  // ログイン用ハンドラ
  async function handleLogin(event) {
    isRunning = true;
    isLoginModalOpen = false;

    // Google Analytics にイベントを送信
    gtag('event', 'login', {
      'event_category': 'button_click',
      'event_label': 'Login Button',
      'value': 1 // 任意の値。必要に応じて変更可能
    });

    const body = new FormData(event.currentTarget);

    const response = await fetch('?/login', {
      method: 'POST',
      credentials: 'include',
      body: body,
    });
    if (response.ok) {
      const result = deserialize(await response.text());
      if (result.type === 'success') {
        isLoggedIn = true;
        isRunning = false;
        successMessage = "ログインに成功しました。シェアボタンで直接画像をポストできます";
        snackbarSuccess.open();
      } else {
        isRunning = false;
        errorMessage = "認証に失敗しました";
        snackbarErrorFetch.open();
      }
    } else {
      isRunning = false;
      const json = await response.json();
      errorMessage = json.error.message;
      snackbarErrorFetch.open();
    }
  }

    // ログアウト用ハンドラ
  async function handleLogout() {
    if (!isRunning) {
      isRunning = true;

      const body = new FormData();

      const response = await fetch('?/logout', {
        method: 'POST',
        credentials: 'include',
        body: body,
      });
      if (response.ok) {
        const result = deserialize(await response.text());
        if (result.type === 'success') {
          isLoggedIn = false;
          isRunning = false;
          successMessage = "ログアウトしました";
          snackbarSuccess.open();
        } else {
          isRunning = false;
          errorMessage = "認証に失敗しました";
          snackbarErrorFetch.open();
        }
      } else {
        isRunning = false;
        const json = await response.json();
        errorMessage = json.error.message;
        snackbarErrorFetch.open();
      }
    }
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
      const minLevel = elements.reduce((min, obj) => {
        return obj.data.level < min ? obj.data.level : min;
      }, Infinity);
      const diffLevel = maxLevel - minLevel;
      // 数式に基づいてオプションを追加
      for (let i = 2; i <= diffLevel+1; i++) {
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
    // Google Analytics にイベントを送信
    gtag('event', 'tap_node', {
      'event_category': 'tap_node',
      'event_label': 'Tap Node',
      'value': 1 // 任意の値。必要に応じて変更可能
    });

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
    const centerNode = elements.filter(obj => obj.data.level === 0);

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

    } else if (isPosting) {
      snackbarWarningPosting.open();

    } else {
      // Google Analytics にイベントを送信
      gtag('event', 'share', {
        'event_category': 'share_button',
        'event_label': 'Share Button',
        'value': 1 // 任意の値。必要に応じて変更可能
      });

      let blob;

      isRunning = true;
      
      if (isGridMode) {
        blob = await captureGrid();
      } else {
        blob = await captureConcentric();
      };

      const objectURL = URL.createObjectURL(blob);

      srcGraph = objectURL;
      isClickShare = true;
      isRunning = false;
    };
  }

  $: {
    if (selectedRadius) {
      // Google Analytics にイベントを送信
      gtag('event', 'select_radius', {
        'event_category': 'select_box_change',
        'event_label': 'Select Box',
        'value': 1 // 任意の値。必要に応じて変更可能
      });
    }
  }

  $: {
    if (isClickHelp) {
      // Google Analytics にイベントを送信
      gtag('event', 'help', {
        'event_category': 'help_button',
        'event_label': 'Help Button',
        'value': 1 // 任意の値。必要に応じて変更可能
      });
    }
  }
</script>

<!-- フォーム -->
<div class="form-container">
  <form method="post" action="?/generate" on:submit|preventDefault={handleSubmit}>
    <input type="text" name="handle" autocomplete="off" placeholder="表示名 or ハンドル名" on:input={handleInput} bind:value={$inputHandle} />
    <button type="submit">Generate!</button>
  </form>
  {#if isShowSuggestion && suggestions.length > 0}
    <div class="suggestions-box">
      <ul>
        {#each suggestions as suggestion}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <li on:click={() => handleSuggestionClick(suggestion)}>{suggestion.handle} ({suggestion.displayName})</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<div id="selectRadius">
  <div class="icon">
    <IconButton class="material-icons">swap_vertical_circle</IconButton>
  </div>
  <select
    id="selectBox"
    bind:value={selectedRadius}
    on:change={() => {
      isRunning = true;
      runConcentric(elements, true); // 第2引数trueで既存ノードをそのままにする
    }}
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
<!-- 初回実行の通知 -->
<Snackbar bind:this={snackbarSuccess}>
  <Label>{successMessage}</Label>
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
{#if (isRunning | isPosting)}
  <div id="loadingSpinner">
    <CircularProgress style="height: 100px; width: 100px;" indeterminate />
  </div>
{/if}
<!-- プログレスバー -->
<!-- {#if (isGenerating)} -->
<Progressbar
  progress={progressGenerate}
  animate
  precision={2}
  labelOutside="相関図を作っています..."
  labelInside
  tweenDuration={1500}
  easing={sineOut}
  size="h-6"
  labelInsideClass="bg-blue-600 text-blue-100 text-base font-medium text-center p-1 leading-none rounded-full"
  class="mb-8"
/>
<!-- {/if} -->

<!-- シェアボタン -->
<div id="shareContainer">
  <!-- ログイン、ログアウトボタン -->
  {#if isLoggedIn}
    <div id="logoutButton">
      <IconButton on:click={handleLogout} class="material-icons">logout</IconButton>
    </div>
  {:else}
    <div id="loginButton">
      <IconButton on:click={() => (!isRunning) ? (isLoginModalOpen = true) : (isLoginModalOpen = false) } class="material-icons">login</IconButton>
    </div>
  {/if}
  <div id="shareButton">
    <IconButton on:click={() => handleShare()} class="material-icons">photo_camera</IconButton>
    <!-- <CameraPhotoSolid on:click={() => handleShare()} /> -->
  </div>
</div>

<!-- ヘルプボタン -->
<div id="helpButton">
  <IconButton on:click={() => isClickHelp = true} class="material-icons">help</IconButton>
  <!-- <QuestionCircleSolid on:click={() => isClickHelp = true} /> -->
</div>

<!-- シェアモーダル -->
<ShareModal
  bind:isClickShare={isClickShare}
  bind:isLoggedIn={isLoggedIn}
  bind:isRunning={isRunning}
  bind:isPosting={isPosting}
  srcGraph={srcGraph}
  on:stopRun={stopRun}
/>

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
<Snackbar bind:this={snackbarWarningPosting}>
  <Label>ポスト中です</Label>
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
</div>

<!-- ログインフォーム -->
<Dialog bind:open={isLoginModalOpen} aria-describedby="login-message">
  <Header>
    <IconButton action="close" class="material-icons">close</IconButton>
  </Header>
  <Content id="login-message">
    <form  method="post" action="?/login" on:submit|preventDefault={handleLogin} class="login-form">
      <label for="handle">ハンドル名:</label>
      <input type="text" name="handle" bind:value={handle} required />
      
      <label for="password">アプリパスワード:</label>
      <input type="password" name="password" bind:value={password} required />

      <div style="font-size: small;"><a href="https://bsky.app/settings/app-passwords" target="_blank">アプリパスワード</a>の設定・入力を推奨します。</div>

      <Button
        type="submit"
        variant="raised"
        style="width: 100%; margin-top: 10px;"
      >
        ログインする
      </Button>
    </form>
  </Content>
</Dialog>

<style>
  .form-container {
    position: fixed;
    width: fit-content;
    margin-top: 16px;
    margin-left: 8px;
    z-index: 5;
  }
  .form-container form {
    position: relative;
    z-index: 1;
  }
  .suggestions-box {
    position: absolute;
    background-color: white;
    border: 1px solid #ccc;
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  }
  .suggestions-box ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .suggestions-box li {
    padding-left: 5px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
  }
  .suggestions-box li:hover {
    background-color: #f0f0f0;
  }
  #selectRadius {
    position: fixed;
    display: flex;
    align-items: center;
    margin-top: 50px;
    margin-left: 0px;
    color: white;
    z-index: 1;
  }
  #selectRadius > .icon {
    pointer-events: none;
  }
  @media screen and (max-width: 600px) {
    form button {
      margin-top: 10px;
      display: block;
    }

    #selectRadius {
      margin-top: 90px;
    }
  }
  #loadingSpinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 3;
  }
  #shareContainer {
    position: fixed;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #loginButton, #logoutButton, #shareButton {
    display: flex;
    align-items: center;
    color: white;
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
  /* ログインフォームのスタイル */
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .login-form label {
    font-weight: bold;
  }
  .login-form input {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
</style>
