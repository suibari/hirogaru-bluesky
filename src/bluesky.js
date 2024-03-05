const { BskyAgent } = require('@atproto/api');
const { response } = require('express');
const service = 'https://bsky.social';

class MyBskyAgent extends BskyAgent {
  static accessJwt;
  static refreshJwt;

  constructor() {
    super({service: service});
    return this;
  }

  async getConcatFollowers(handleordid) {
    let followers = [];
    
    const params = {
      actor: handleordid
    }

    let response = await this.getFollowers(params);
    followers = response.data.followers;

    while ('cursor' in response.data) {
      const paramswithcursor = Object.assign(params, {
        cursor: response.data.cursor
      });

      response = await this.getFollowers(paramswithcursor);
      followers = followers.concat(response.data.followers);
    };
    return followers;
  }

  async getConcatFollows(handleordid) {
    let follows = [];
    
    const params = {
      actor: handleordid
    }

    let response = await this.getFollows(params);
    follows = response.data.follows;

    while ('cursor' in response.data) {
      const paramswithcursor = Object.assign(params, {
        cursor: response.data.cursor
      });

      response = await this.getFollows(paramswithcursor);
      follows = follows.concat(response.data.follows);
    };
    return follows;
  }

  async listUnreadNotifications() {
    let notifications = [];

    const params = {
      limit: 100
    };

    let response = await this.listNotifications(params);
    for (let notification of response.data.notifications) {
      if (!notification.isRead) {
        notifications.push(notification);
      }
    }

    while ('cursor' in response.data) {
      const paramswithcursor = Object.assign(params, {
        cursor: response.data.cursor
      });

      response = await this.listNotifications(paramswithcursor);
      for (let notification of response.data.notifications) {
        if (!notification.isRead) {
          notifications.push(notification);
        }
      }
    }
    return notifications;
  }

  async postGreets() {
    const text = "@"+user.handle+"\n"+
                 "こんにちは！\n"+
                 "全肯定botたんです！\n"+
                 "あなたのポストに全肯定でリプライするよ！\n"+
                 "すぐには反応できないかもだけど許してね～。\n"+
                 "これからもよろしくね！";

    const text_firstblock = text.split('\n');
    const record = {
      text: text,
      facets: [{
        index: {
          byteStart: 0,
          byteEnd: getHalfLength(text_firstblock)
        },
        features: [{
          $type: 'app.bsky.richtext.facet#link',
          uri: 'https://bsky.app/profile/'+user.handle
        },
        {
          $type: 'app.bsky.richtext.facet#mention',
          did: user.did
        }]
      }]
    };

    await this.post(record);
    return;
  }

  async replyAffermativeWord(replyPost) {
    let text = getRandomWord();
    text = text.replace("${name}", replyPost.author.displayName);

    const record = {
      text: text,
      reply: {
        root: {
          uri: replyPost.uri,
          cid: replyPost.cid
        },
        parent: {
          uri: replyPost.uri,
          cid: replyPost.cid
        }
      }
    };

    await this.post(record);
    return;
  }

  isMention(post) {
    if ('facets' in post.record) {
      const facets = post.record.facets;
      for (const facet of facets) {
        for (const feature of facet.features) {
          if (feature.$type == 'app.bsky.richtext.facet#mention') {
            return true;
          }
        }
      }
    }
    return false;
  }

  isLinks(post) {
    if ('facets' in post.record) {
      const facets = post.record.facets;
      for (const facet of facets) {
        for (const feature of facet.features) {
          if (feature.$type == 'app.bsky.richtext.facet#link') {
            return true;
          }
        }
      }
    }
    return false;
  }

  getLinks(post) {
    let uriArray = [];
    if (this.isLinks(post)) {
      for (const facet of post.record.facets) {
        for (const feature of facet.features) {
          if (feature.$type == 'app.bsky.richtext.facet#link'){
            uriArray.push(feature.uri);
          }
        }
      }
    }
    console.log(uriArray);
    return uriArray;
  }

  // input: array[] of did; output: array of profile;
  async getConcatProfiles(actors) {
    const batchSize = 25;
    let didArray = [];
    let actorsWithProf = [];

    for (const actor of actors) {
      didArray.push(actor);
    };
    for (let i = 0; i < didArray.length; i += batchSize) {
      const batch = didArray.slice(i, i + batchSize);
      const profiles = await this.getProfiles({actors: batch});
      actorsWithProf = actorsWithProf.concat(profiles.data.profiles);
    };
    // console.log(actorsWithProf)
    return actorsWithProf;
  }
  
  async setMutual(myself, follows) {
    // 自分がフォローしている人が自分をフォローしていたらmutualをtrueに、そうでなければfalseにする
    for (const follow of follows) {
      const followsOfFollows = await this.getConcatFollows(follow.did);
      follow.mutual = false;
      for (const followOfFollows of followsOfFollows) {
        if (myself.did == followOfFollows.did) {
          follow.mutual = true;
          break;
        };
      };
    };
    // // 自分がフォロワーをフォローしていたらmutualをtrueに、そうでなければfalseにする
    // for (const follower of followers) {
    //   follower.mutual = false;
    //   for (const follow of follows) {
    //     if (follow.did == follower.did) {
    //       follower.mutual = true;
    //       break;
    //     };
    //   };
    // };
  }

  async createOrRefleshSession() {
    if ((!this.accessJwt) && (!this.refreshJwt)) {
      // 初回起動時にaccsessJwt取得
      const response = await this.login({
        identifier: process.env.BSKY_IDENTIFIER,
        password: process.env.BSKY_APP_PASSWORD
      });
      this.accessJwt = response.data.accessJwt;
      this.refreshJwt = response.data.refreshJwt;
      // console.log(this.accessJwt)
      console.log("[INFO] created new session.");
    };
    const response = await this.getTimeline();
    if ((response.status == 400) && (response.data.error == "ExpiredToken")) {
      // accsessJwt期限切れ
      const response = await this.refreshSession();
      this.accessJwt = response.data.accessJwt;
      this.refreshJwt = response.data.refreshJwt;
      console.log("[INFO] token was expired, so refleshed the session.");
    };
  }

  async filterFollowsByInteractScore(actor, follows) {
    const REPLY_SCORE = 3;
    const LIKE_SCORE = 1;

    for (const follow of follows) {
      follow.score = 0; // 初期化

      // actorへのリプライ回数をカウント
      const responseReply = await this.getAuthorFeed({
        actor: follow.did,
        limit: 50,
        // filter: 'posts_with_replies',
      });
      const feeds = responseReply.data.feed;
      for (const feed of feeds) {
        const actorDid = actor.did;
        const replyDid = feed.reply?.parent?.author?.did;
        if (actorDid == replyDid) {
          // 自分へのリプライである
          follow.score = follow.score + REPLY_SCORE;
        };
      };

      // actorへのいいね数をカウント
      // const responseLikes = await this.getActorLikes({
      //   actor: followorfollower.did,
      //   limit: 100,
      // });
    };

    // プロパティの値が大きい順にソート
    follows.sort((a, b) => b.score - a.score);
    // const sortedDid = Object.keys(countMap).sort((a, b) => countMap[b] - countMap[a]);
    // console.log(sortedDid);

    // threshold までの actorDid を抜き出す
    // followsandfollowers = followsandfollowers.slice(0, threshold);
    // console.log(filteredDid);

    // let profiles = [];
    // if (filteredDid.length > 0) {
    //   // Profile配列にして返す
    //   const response = await this.getProfiles({actors: filteredDid});
    //   profiles = response.data.profiles;
    // }

    return follows;
  }

  async getConcatAuthorFeed(handleordid, threshold_tl) {
    let feeds = [];
    let cursor;
    let response;

    response = await this.getAuthorFeed({actor: handleordid, limit: 100});
    feeds = feeds.concat(response.data.feed);
    cursor = response.data.cursor;
    while ((cursor) && (threshold_tl > feeds.length)) {
      response = await this.getAuthorFeed({actor: handleordid, limit: 100, cursor: cursor});
      feeds = feeds.concat(response.data.feed);
      cursor = response.data.cursor;
    };
    return feeds;
  }

  async getConcatActorLikes(handleordid, threshold_like) {
    let likes = [];
    let cursor;

    try {
      let response = await this.getActorLikes({actor: handleordid, limit: 100});
      likes = likes.concat(response.data.feed);
      cursor = response.data.cursor;
      while ((cursor) && (response.data.feed.length > 0) && (threshold_like > likes.length)) {
        response = await this.getActorLikes({actor: handleordid, limit: 100, cursor: cursor});
        likes = likes.concat(response.data.feed);
        cursor = response.data.cursor;
      };
      return likes;
    } catch(e) {
      return [];
    }
  }

  async getConcatActorLikeRecords(handle, threshold_like) {
    let records = [];
    let cursor;

    try {
      let response = await this.listRecords({repo: handle, collection: "app.bsky.feed.like", limit: 100});
      records = records.concat(response.records);
      cursor = response.cursor;
      while ((cursor) && (threshold_like > records.length)) {
        response = await this.listRecords({repo: handle, collection: "app.bsky.feed.like", limit: 100, cursor: cursor});
        records = records.concat(response.records);
        cursor = response.cursor;
      };
      return records;
    } catch(e) {
      return [];
    }
  }

  async listRecords(queryParams) {
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.accessJwt}`,
      }
    };

    const url = new URL("https://bsky.social/xrpc/com.atproto.repo.listRecords");
    Object.keys(queryParams).forEach(key => url.searchParams.append(key, queryParams[key]));
    // console.log(url.toString())
    
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      };
      const data = await response.json();
      return data;

    } catch(e) {
      console.error('There was a problem with your fetch operation:', e);
      throw e;
    };
  }

  async getArraySortedReplyToAndLikeCount(handle, threshold_nodes, threshold_tl, threshold_like) {
    const SCORE_REPLY = 3;
    const SCORE_LIKE = 1;
    let didLike = [];
    let resultArray = [];
    let didArray = [];

    const feeds = await this.getConcatAuthorFeed(handle, threshold_tl);
    console.log("[INFO] got " + feeds.length + " posts by " + handle);
    // const likes = await this.getConcatActorLikes(handle, threshold_like); // 現状、likeがとれるのはログインユーザだけ
    const records = await this.getConcatActorLikeRecords(handle, threshold_like);
    for (const record of records) {
      const uri = record.value.subject.uri;
      const did = uri.match(/did:plc:\w+/); // uriからdid部分のみ抜き出し
      didLike.push(did[0]);
    };
    console.log("[INFO] got " + didLike.length + " likes by " + handle);
  
    // 誰に対してリプライしたかをカウント
    for (const [index, feed] of Object.entries(feeds)) {
      if (feed.reply) {
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
      };
      // // 誰からいいねされたかをカウント
      // if (threshold_like > index) { // 直近threshold_like件のfeedに対して
      //   const response = await this.getLikes({uri: feed.post.uri});
      //   const likes = response.data.likes;
      //   for (const like of likes) {
      //     const likeBy = like.actor.did;
      //     let flagFound = false;
      //     for (const node of resultArray) {
      //       if (likeBy == node.did) {
      //         node.score = node.score + SCORE_LIKE;
      //         flagFound = true;
      //         break;
      //       };
      //     };
      //     if (!flagFound) {
      //       resultArray.push({did: likeBy, score: SCORE_LIKE});
      //     };
      //   };
      // };
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
    didArray = didArray.slice(0, threshold_nodes);
    // Profiles配列取得
    let friendsWithProf = [];
    if (didArray.length > 0) { // 誰にもリプライしてない人は実行しない
      friendsWithProf = await this.getConcatProfiles(didArray);
    }
    // いいね集計ができないと表示人数が少なく見栄えが悪い。FFを加えておく(要検討)
    // const follows = await this.getConcatFollows(handle);
    // friendsWithProf = friendsWithProf.concat(follows);
    // const followers = await this.getConcatFollowers(handle); // フォロワーを含めるとインフルエンサー実行時に終わらない
    // friendsWithProf = friendsWithProf.concat(followers);
    
    return friendsWithProf;
  }
}

async function setScore(followorfollower, func) {
  const response = await func({
    actor: followorfollower.did,
    limit: 100,
  });
  const feeds = response.data.feed;
  for (const feed of feeds) {
    const actorDid = actor.did;
    const replyDid = feed.reply?.parent?.author?.did;
    if (actorDid == replyDid) {
      // 自分へのリプライである
      countMap[followorfollower.did] = (countMap[followorfollower.did] || 0) + REPLY_SCORE;
    };
  }
}

module.exports = MyBskyAgent;