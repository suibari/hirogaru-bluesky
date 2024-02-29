const { BskyAgent, default: AtpAgent } = require('@atproto/api');
// const { getHalfLength , getRandomWord }  = require('./util');
const service = 'https://bsky.social';

class MyBskyAgent extends BskyAgent {
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

  async getConcatProfiles(actors) {
    const batchSize = 25;
    let didArray = [];
    let actorsWithProf = [];

    for (const actor of actors) {
      didArray.push(actor.did);
    };
    for (let i = 0; i < didArray.length; i += batchSize) {
      const batch = didArray.slice(i, i + batchSize);
      const profiles = await this.getProfiles({actors: batch});
      actorsWithProf = actorsWithProf.concat(profiles.data.profiles);
    };
    return actorsWithProf;
  }
  
  async setMutual(myself, follows, followers) {
    // 自分がフォローしている人が自分をフォローしていたらmutualをtrueに、そうでなければfalseにする
    for (const follow of follows) {
      const response = await this.getFollows({actor: follow.did});
      const followsOfFollows = response.data.follows;
      follow.mutual = false;
      for (const followOfFollows of followsOfFollows) {
        if (myself.did == followOfFollows.did) {
          follow.mutual = true;
          break;
        };
      };
    };
    // 自分がフォロワーをフォローしていたらmutualをtrueに、そうでなければfalseにする
    for (const follower of followers) {
      follower.mutual = false;
      for (const follow of follows) {
        if (follow.did == follower.did) {
          follower.mutual = true;
          break;
        };
      };
    };
  }
}

module.exports = MyBskyAgent;