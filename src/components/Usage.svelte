<script>
  import Tooltip, { Wrapper } from '@smui/tooltip';
</script>

<h5>基本的な使い方</h5>
<ul>
  <li><a href="https://bsky.app/" target="_blank">Bluesky</a> のハンドル名(～.bsky.socialまで)を入れて<b>Generate!</b>を押してください</li>
  <li>その人の<b>相関図</b>を作成します</li>
  <li>相関図の中心が自分、そこに近づくほど仲良しの人です</li>
  <li><b>利用にあたりパスワードを入力する必要がないので、ユーザ情報が漏れる心配もいっさいありません!</b></li>
</ul>
<h5>相関図のしくみ</h5>
<ul>
  <li>
    仲良し度は
    <Wrapper>
      <span class="tips" role="button">リプライやいいねの頻度</span>
      <Tooltip>
          相関図中心ユーザの直近1000件のポストと100件のいいねを取得し、
          リプライは10点、いいねは1点で各ユーザごとに加点し、各ユーザとの仲良し度を求めます
      </Tooltip>
    </Wrapper>
    で変わります
  </li>
  <li>
    アイコンの大きさは
    <Wrapper>
      <span class="tips" role="button">フォロワーの数</span>
      <Tooltip>
        log<sub>10</sub>(1000×フォロワーの数/フォローの数)×30-50 を最低値20、最高値60でクリップした数
      </Tooltip>
    </Wrapper>
    に比例します。アイコンの大きいユーザを見つけてみよう
  </li>
  <li>
    <Wrapper>
      <span class="tips" role="button">相関図に出てくる人</span>
      <Tooltip>
        仲良し度を上位順にソートし、内側から上位36名を掲載します。
        同じ仲良し度だった場合は、より新しいリプライをした方が優先されます。
        関わりのある人が36人に満たない場合、フォローしている人も表示されます。
        それでも36人に満たない場合は相関図に空欄ができます
      </Tooltip>
    </Wrapper>
    が少ない時は、Blueskyでいいね・リプライしよう!
  </li>
  <li><b>結果はリアルタイムに反映される</b>ので、また相関図を作ってみよう!</li>
  <li>相関図は大体のアカウントなら<b>20秒弱</b>で生成できるはずです</li>
  </ul>
<h5>相関図で遊ぼう</h5>
<ul>
  <li>各ユーザのアイコンをクリックするとメニューが出ます</li>
  <li><b>メニュー選択でプロフィールに飛んだり、その人を中心に相関図を再生成できたり、関係性を分析できます</b></li>
  <li>
    関係性分析は、
    <Wrapper>
      <span class="tips" role="button">相関図中央のユーザと選択したユーザ間の仲良し度を分析して</span>
      <Tooltip>
        (50×小さい方の仲良し度/大きい方の仲良し度) + (自分と相手の大きい方の仲良し度を10で割った数)
      </Tooltip>
    </Wrapper>
    、関係性を出します
  </li>
  <li>関係性は<b>お互いに均等かつたくさんリプライといいねする</b>ことで上がる仕様となっています</li>
  <li>相関図表示時、右上のシェアボタンで相関図を画像として表示します。コピペしてBlueskyに投稿!</li>
  <li>相関図・関係性分析ともに、生成時間は主にポスト数で変わってきますが、1分はかかりません。生成時間が長すぎる時はリロードしてみてください</li>
  </ul>
<h5>その他</h5>
<ul>
  <li>ご意見ご要望は開発者の <a href="https://bsky.app/profile/suibari-cha.bsky.social" target="_blank">すいばり</a> までお気軽にどうぞ！</li>
</ul>

<style>
  .tips {
    text-decoration: underline;
    cursor: pointer;
  }
</style>