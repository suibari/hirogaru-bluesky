import { Blueskyer } from "blueskyer";
import { supabase } from "./supabase";
import atproto from '@atproto/api';
const { RichText } = atproto;

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
        if (feed.reply) {
          if (feed.reply.parent.$type === 'app.bsky.feed.defs#postView') {
            if (feed.reply.parent.author.handle != handle) { // 自分に対するリプライは除外
              const replyTo = feed.reply.parent.author.did;
              let flagFound = false;
              for (const node of resultArray) {
                if (replyTo == node.did) {
                  node.score = node.score + SCORE_REPLY;
                  node.replyCount++;
                  flagFound = true;
                  break;
                };
              };
              if (!flagFound) {
                resultArray.push({did: replyTo, score: SCORE_REPLY, replyCount: 1});
              };
            };
          };
        };
      };
      // for likes[]
      for (const did of didLike) {
        let flagFound = false;
        for (const node of resultArray) {
          if (did == node.did) {
            node.score = node.score + SCORE_LIKE;
            if (node.likeCount) {
              node.likeCount++;
            } else {
              node.likeCount = 1;
            }
            flagFound = true;
            break;
          };
        };
        if (!flagFound) {
          resultArray.push({did: did, score: SCORE_LIKE, likeCount: 1});
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
        friend.replyCount = resultArray[index].replyCount;
        friend.likeCount = resultArray[index].likeCount;
      };

      return friendsWithProf;
    } catch (e) {
      throw e;
    }
  }

  /**
   * アクセストークンとリフレッシュトークンが未取得ならセッションを作成、既取得で期限切れならセッションをリフレッシュ
   * 元のライブラリをオーバーライドしVercel KVに値を保存
   */
  async createOrRefleshSession(identifier, password) {
    const {data, err} = await supabase.from('tokens').select('access_jwt').eq('handle', identifier);
    
    if (data.length === 0) {
      // 初回起動時にaccsessJwt取得
      const response = await this.login({
        identifier: identifier,
        password: password
      });
      const {err} = await supabase.from('tokens').insert({ handle: identifier, access_jwt: response.data.accessJwt });
      console.log("[INFO] created new session.");
    } else {
      // DBから取ってきた値をインスタンスにセット
      this.api.setHeader('Authorization', `Bearer ${data[0].access_jwt}`);
      try {
        await this.getTimeline().catch(async err => {
          if ((err.status === 400) && (err.error === "ExpiredToken")) {
            // accsessJwt期限切れ
            const response = await this.login({
              identifier: identifier,
              password: password
            });
            const {err} = await supabase.from('tokens').update({ access_jwt: response.data.accessJwt, updated_at: new Date() }).eq('handle', identifier);
            console.log("[INFO] token was expired, so refleshed the session.");
          }
        });
      } catch (e) {
        throw e;
      }
    }
  }

  async postWithImage(text, imgBlob) {
    // Blobをアップロード
    const dataArray = new Uint8Array(await imgBlob.arrayBuffer());
    const result = await this.uploadBlob(
      dataArray,
      {
        encoding: imgBlob.type,
      }
    );

    // リッチテキスト変換
    const rt = new RichText({text: text});
    await rt.detectFacets(this);

    // 投稿
    await this.post({
      text: rt.text,
      facets: rt.facets,
      embed: {
        $type: 'app.bsky.embed.images',
        images: [
          {
            alt: 'ひろがるBluesky! 相関図',
            image: result.data.blob,
            aspectRatio: {
              width: 1,
              height: 1,
            }
          }
        ]
      },
      langs: ["ja-JP"],
      createdAt: new Date().toISOString(),
    });
  }
}