<script>
  import { onMount } from 'svelte';
  import Dialog, { Content, Header } from '@smui/dialog';
  import Textfield from '@smui/textfield';
  import Button from '@smui/button';
  import IconButton from "@smui/icon-button";
  import Snackbar, { Actions, Label } from '@smui/snackbar';
  
  export let isClickShare = false;
  export let isLoggedIn;
  export let isPosting = false;
  export let srcGraph = '';
  export let isLoginModalOpen;
  let isShowTimeStamp, isShowLogo = true;
  let snackbarSuccess, snackbarErrorFetch, snackbarWarningPosting;
  let successMessage, errorMessage = '';
  let modifiedImgBlob = null;
  let modifiedImgUrl = '';
  
  let postText = "\n#ひろがるBluesky\nhttps://hirogaru-bluesky.vercel.app/";

  $: {
    if (isClickShare) {
      insertLetterToImg();
    }
  }

  $: {
    if ((isShowLogo || isShowTimeStamp) || (!isShowLogo && !isShowTimeStamp)) {
      insertLetterToImg();
    }
  }

  onMount(() => {
    isShowTimeStamp = JSON.parse(localStorage.getItem('isShowTimestamp'));
    isShowLogo = JSON.parse(localStorage.getItem('isShowLogo'));
  });

  async function insertLetterToImg () {
    if (!srcGraph) return;

    const canvas = document.createElement('canvas');
    const image = new Image();
    image.src = srcGraph;

    image.onload = () => {
      const ctx = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;

      // 画像を描画
      ctx.drawImage(image, 0, 0);

      ctx.font = '18px myFont';
      ctx.fillStyle = 'white';
      const margin = 10;

      // ロゴを描画
      if (isShowLogo) {
        const text = '#ひろがるBluesky!';
        ctx.fillText(text, margin, image.height - margin);
      }

      // タイムスタンプを描画
      if (isShowTimeStamp) {
        const now = new Date();
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const formattedDate = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}(${daysOfWeek[now.getDay()]}) ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const textWidth = ctx.measureText(formattedDate).width;
        ctx.fillText(formattedDate, image.width - textWidth - margin, image.height - margin);
      }

      // blobに変換し、createObjectURLで表示
      canvas.toBlob(blob => {
        modifiedImgBlob = blob;
        modifiedImgUrl = URL.createObjectURL(blob);

        isClickShare = true;
      }, 'image/png');
    };
  }

  $: {
    if (!isClickShare && modifiedImgUrl) {
      // Revoke the object URL when the dialog is closed
      URL.revokeObjectURL(modifiedImgUrl);
      modifiedImgUrl = ''; // Reset the URL after revoking
    }
  }

  async function handlePost() {
    isPosting = true;
    isClickShare = false;

    const formData = new FormData();
    formData.append("image", modifiedImgBlob, "share-image.png");
    formData.append("text", postText);

    // ロゴ、タイムスタンプのチェック状態を保存
    localStorage.setItem('isShowTimestamp', JSON.stringify(isShowTimeStamp));
    localStorage.setItem('isShowLogo', JSON.stringify(isShowLogo));

    try {
      const response = await fetch("?/post", {
        method: "POST",
        body: formData
      });

      isPosting = false;
      if (response.ok) {
        successMessage = "ポストしました!";
        snackbarSuccess.open();
      } else {
        const json = await response.json();
        errorMessage = json.error.message;
        snackbarErrorFetch.open();
      }
    } catch (error) {
      console.error("Error posting:", error);
    }
  }
</script>

<Dialog
  bind:open={isClickShare}
  aria-describedby="share-message"
>
  <Header>
    <IconButton action="close" class="material-icons" style="float: right;">close</IconButton>
  </Header>
  <Content id="share-message">  
    <img id="share-image" src={modifiedImgUrl} alt="ひろがるBluesky相関図">
    <div style="text-align: right; margin: 5px 0px 5px;">
      <label style="margin-left: 8px;">
        <input type="checkbox" bind:checked={isShowLogo} /> ロゴ
      </label>
      <label style="margin-left: 8px;">
        <input type="checkbox" bind:checked={isShowTimeStamp} /> タイムスタンプ
      </label>
    </div>
    {#if isLoggedIn}
      <Textfield
        textarea
        input$maxlength={300}
        bind:value={postText}
        style="width: 100%; margin-top: 10px; height: 130px;" 
      >        
      </Textfield>
      <div style="text-align: right; margin-top: 5px; font-size: small;">
        {postText.length} / 300
      </div>
      <Button
        style="width: 100%; margin-top: 10px; text-transform: none;"
        on:click={handlePost}
        variant="raised"
      >
        Blueskyにポストする
      </Button>
    {:else}
      <ol>
        <li>画像を右クリックかロングタップでコピーしてください</li>
        <li><a href="https://bsky.app/intent/compose?text=%23%E3%81%B2%E3%82%8D%E3%81%8C%E3%82%8BBluesky%0D%0Ahttps%3A%2F%2Fhirogaru-bluesky.vercel.app%2F%0D%0A" target="_blank">こちら</a>をクリックして、開いたポスト画面に画像をペーストしてシェア！</li>
      </ol>
      <div style="font-size: small; margin-top: -10px;">
        ※
        <!-- svelte-ignore a11y-invalid-attribute -->
        <a href="javascript:void(0)" style="cursor: pointer;" on:click={() => isLoginModalOpen = true}>
          ログイン
        </a>
        すると、ボタン1回でBlueskyに投稿できるようになります。ぜひ試してみてください!
      </div>
    {/if}
  </Content>
</Dialog>

<!-- 汎用エラー -->
<Snackbar bind:this={snackbarErrorFetch} class="error">
  <Label>エラーが発生しました: {errorMessage}</Label>
  <Actions>
    <IconButton class="material-icons" title="Dismiss">close</IconButton>
  </Actions>
</Snackbar>
<!-- 汎用成功 -->
<Snackbar bind:this={snackbarSuccess} class="success">
  <Label>{successMessage}</Label>
  <Actions>
    <IconButton class="material-icons" title="Dismiss">close</IconButton>
  </Actions>
</Snackbar>
<!-- ポスト中 -->
<Snackbar bind:this={snackbarWarningPosting} class="warning">
  <Label>ポスト処理中です</Label>
  <Actions>
    <IconButton class="material-icons" title="Dismiss">close</IconButton>
  </Actions>
</Snackbar>

<style>
  @font-face {
    font-family: 'myFont';
    src: url('/fonts/mgenplus-1c-medium.ttf') format('truetype');
  }

  #share-image {
    max-width: 100%;
    height: auto;
  }
</style>