<script>
  import Dialog, { Content, Header } from '@smui/dialog';
  import IconButton from "@smui/icon-button";

  export let isClickShare = false;
  export let isLoggedIn;
  export let srcGraph = '';
  let modifiedImgBlob = null;
  let modifiedImgUrl = '';
  let postText = "\n#ひろがるBluesky\nhttps://hirogaru-bluesky.vercel.app/";

  $: if (isClickShare) {
    insertLetterToImg();
  }

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

      // テキストを描画
      ctx.font = '18px myFont';
      ctx.fillStyle = 'white';
      const text = '#ひろがるBluesky!';
      const margin = 10;
      ctx.fillText(text, margin, image.height - margin);

      // blobに変換し、createObjectURLで表示
      canvas.toBlob(blob => {
        modifiedImgBlob = blob;
        modifiedImgUrl = URL.createObjectURL(blob);
      }, 'image/png');
    };
  }

  async function handlePost() {
    const formData = new FormData();
    formData.append("image", modifiedImgBlob, "share-image.png");
    formData.append("text", postText);

    try {
      const response = await fetch("?/post", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        console.log("Post successful!");
      } else {
        console.error("Failed to post", response.statusText);
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
    {#if isLoggedIn}
      <img id="share-image" src={modifiedImgUrl} alt="ひろがるBluesky相関図">
      <textarea
        id="share-text"
        bind:value={postText}
        style="width: 100%; margin-top: 10px;"
        rows="4"
      ></textarea>
      <button
        style="width: 100%; margin-top: 10px;"
        on:click={handlePost}
      >
        ポストする
      </button>
    {:else}
      <img id="share-image" src={modifiedImgUrl} alt="ひろがるBluesky相関図">
      <ol>
        <li>画像を右クリックかロングタップでコピーしてください</li>
        <li><a href="https://bsky.app/intent/compose?text=%23%E3%81%B2%E3%82%8D%E3%81%8C%E3%82%8BBluesky%0D%0Ahttps%3A%2F%2Fhirogaru-bluesky.vercel.app%2F%0D%0A" target="_blank">こちら</a>をクリックして、開いたポスト画面に画像をペーストしてシェア！</li>
      </ol>
    {/if}
  </Content>
</Dialog>

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