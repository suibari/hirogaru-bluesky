import { Blueskyer } from "blueskyer";

export class MyBlueskyer extends Blueskyer {
    /**
   * 指定されたユーザが返信・いいねした数から、各ユーザに対するエンゲージメントのスコアを取得、上位順に並べたProfile配列を返す
   * @param {string} handle - ハンドル名
   * @param {int} threshold_tl - 取得するfeed数
   * @param {int} threshold_like - 取得するいいね数
   * @param {int} SCORE_REPLY - リプライで加点するエンゲージメントスコア
   * @param {int} SCORE_LIKE - いいねで加点するエンゲージメントスコア
   * @returns
   */
  async getInvolvedEngagements(handle, threshold_tl, threshold_like, SCORE_REPLY, SCORE_LIKE) {
    let didLike = [];
    let resultArray = [];
    let didArray = [];

    try {
      const feeds = await this.getConcatAuthorFeed(handle, threshold_tl);
      const records = await this.getConcatActorLikeRecords(handle, threshold_like);
      for (const record of records) {
        const uri = record.value.subject.uri;
        const did = uri.match(/did:plc:\w+/); // uriからdid部分のみ抜き出し
        if (did) {
          didLike.push(did[0]);
        };
      };
      // console.log("[INFO] got " + didLike.length + " likes by " + handle);
    
      // 誰に対してリプライしたかをカウント
      for (const [index, feed] of Object.entries(feeds)) {
        const reply = feed.reply;
        if (reply) {
          if (reply.parent.$type === 'app.bsky.feed.defs#postView') { // replyの中身がある場合のみ
            if (handle != feed.reply.parent.author.handle) { // 自分に対するリプライは除外
              const replyTo = feed.reply.parent.author.did;
              let flagFound = false;
              for (const node of resultArray) {
                if (replyTo == node.did) {
                  node.score = node.score + SCORE_REPLY;
                  flagFound = true;
                  break;
                };
              };
              if (!flagFound) {
                resultArray.push({did: replyTo, score: SCORE_REPLY});
              };
            };
        } ;
        };
      };
      // for likes[]
      for (const did of didLike) {
        let flagFound = false;
        for (const node of resultArray) {
          if (did == node.did) {
            node.score = node.score + SCORE_LIKE;
            flagFound = true;
            break;
          };
        };
        if (!flagFound) {
          resultArray.push({did: did, score: SCORE_LIKE});
        };
      };
      // scoreで降順ソート
      resultArray.sort((a, b) => b.score - a.score);
      // オブジェクト配列からdidキーのみ抜いて配列化する
      didArray = resultArray.map(obj => obj.did);
      // 上位のみ抜き取る
      // didArray = didArray.slice(0, threshold_nodes);
      // Profiles配列取得
      let friendsWithProf = [];
      if (didArray.length > 0) { // 誰にもリプライしてない人は実行しない
        friendsWithProf = await this.getConcatProfiles(didArray);
      };
      // エンゲージメントスコアを格納しておく
      for (const [index, friend] of Object.entries(friendsWithProf)) {
        friend.engagement = resultArray[index].score;
      };

      return friendsWithProf;
    } catch (e) {
      throw e;
    }
  }
}