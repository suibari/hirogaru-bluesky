<div id="titleContainer">
  <div id="title">ひろがるBluesky!</div>
  <div id="subtitle">
    <div>左上にBlueskyのハンドル名を入力して、</div>
    <div>無限に広がる相関図をつくろう</div>
    <div>利用にログインやインストールは必要ありません</div>
    <div>わからないことがあれば右下のヘルプをどうぞ</div>
  </div>
</div>

<style>
  #titleContainer {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    /* height: 100%; */
    width: 100%;
    text-align: center;
  }
  #title {
    font-size: 3em;
    margin-bottom: 20px;
    animation: fadeIn 2s ease-out;
  }
  #subtitle {
    font-size: 1.1em;
    opacity: 0;
    animation: slideIn 2s ease-out forwards;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideIn {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>