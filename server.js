const MyBskyAgent = require('./src/bluesky.js');
const { getElements, removeInvalidLinks } = require('./src/databuilder.js');
const express = require('express');
const agent = new MyBskyAgent();

const app = express();
const port = 3000;

app.use(express.static('./'));
app.get('/data', async (req, res) => {
  try {
    const handle = req.query.handle;
    const data = await getData(handle);
    res.json(data);
    console.log("[INFO] send data to client.")
  } catch (e) {
    res.status(500);
  }
})
app.listen(port, () => {
  console.log(`[INFO] Server is running on http://localhost:${port}`);
})

async function getData(handle) {
  const SCORE_THRESHOLD = 100;

  try {
    await agent.createOrRefleshSession();
    
    // 自分のプロフィール
    const response = await agent.getProfile({actor: handle});
    const myselfWithProf = response.data;
    console.log("[INFO] got profile " + handle);
    // フォロイーのプロフィール
    // const filteredFollows = await agent.filterFollowsByRepliedCount(myselfWithProf, REPLYRANK_THRESHOLD_FOLLOW)
    const follows = await agent.getConcatFollows(handle);
    const followsWithProf = await agent.getConcatProfiles(follows); // post数とfollower数を取得するため
    // await agent.setMutual(myselfWithProf, filteredFollows); // 相互フォローチェック
    console.log("[INFO] got profiles " + followsWithProf.length + " about follows of " + handle);
    // フォロワーのプロフィール
    const followers = await agent.getConcatFollowers(handle);
    let followersWithProf = await agent.getConcatProfiles(followers); // post数とfollower数を取得するため
    // await agent.setMutual(myselfWithProf, followsWithProf, followersWithProf); // 相互フォローチェックにmutualプロパティを付与
    console.log("[INFO] got profiles " + followersWithProf.length + " about followers of " + handle);
    // フォロイー、フォロワーを得点順ソートし、フォロワーの重複除去し、スレッショルドで切る
    await agent.filterFollowsByInteractScore(myselfWithProf, followsWithProf);
    followersWithProf = followersWithProf.filter(follower => !followsWithProf.some(follow => follow.did === follower.did));
    let followsandfollowersWithProf = followsWithProf.concat(followersWithProf);
    followsandfollowersWithProf = followsandfollowersWithProf.slice(0, SCORE_THRESHOLD);
    console.log("[INFO] sorted and filterd about follows and followers of " + handle);
    // フォロイーのフォロイーのプロフィール
    // {
    //   follow.did: [prof, prof, ...],
    //   ...
    // }
    // let followsOfFollowsWithProf = {};
    // for (const follow of filteredFollows) {
    //   const filteredFollowsOfFollow = await agent.filterFollowsByRepliedCount(follow, REPLYRANK_THRESHOLD_FOLLOWOFFOLLOW);
    //   // const followsOfFollow = await agent.getConcatFollows(follow.did);
    //   // const followsOfFollowWithProf = await agent.getConcatProfiles(filteredFollowsOfFollow);
    //   if (filteredFollowsOfFollow.length > 0) {
    //     await agent.setMutual(follow, filteredFollowsOfFollow); // 相互フォローチェック
    //     followsOfFollowsWithProf[follow.did] = filteredFollowsOfFollow;
    //     console.log("[INFO] got profiles " + followsOfFollowsWithProf[follow.did].length + " about follows of " + follow.handle);
    //   }
    // };
    // node, edge取得
    let elements = await getElements(myselfWithProf, followsandfollowersWithProf);
    
    // const followers = await agent.getConcatFollowers(handle);
    // const followersWithProf = await agent.getConcatProfiles(followers); // post数とfollower数を取得するため
    // await agent.setMutual(myselfWithProf, followsWithProf, followersWithProf); // 相互フォローチェックにmutualプロパティを付与
    
    // // 2nd~ depth
    // for (const follow of follows) {
    //   const response = await agent.getProfile({actor: follow.did});
    //   // console.log(response.data)
    //   if ((response.data.followsCount < FF_THRESHOLD) && (response.data.followersCount < FF_THRESHOLD)) {
    //     console.log("start follow: "+follow.displayName);
    //     // follow
    //     const followOfFollows = await agent.getConcatFollows(follow.did);
    //     const followOfFollowers = await agent.getConcatFollowers(follow.did);
    //     const dataOfFollows = await databuilder.getNodesAndLinks(follow, followOfFollows, followOfFollowers, 2);
    //     elements = elements.concat(dataOfFollows);
    //     console.log("complete follow: "+follow.displayName);
    //   }
    // };
    // for (const follower of followers) {
    //   const response = await agent.getProfile({actor: follower.did});
    //   if ((response.data.followsCount < FF_THRESHOLD) && (response.data.followersCount < FF_THRESHOLD)) {
    //     console.log("start follower: "+follower.displayName);
    //     // follower
    //     const followerOfFollows = await agent.getConcatFollows(follower.did);
    //     const followerOfFollowers = await agent.getConcatFollowers(follower.did);
    //     const dataOfFollowers = await databuilder.getNodesAndLinks(follower, followerOfFollows, followerOfFollowers, 2);
    //     elements = elements.concat(dataOfFollowers);
    //     console.log("complete follow: "+follower.displayName);
    //   }
    // };
    console.log(elements.length);
    
    // ファイル保存
    // for (const element of elements) {
    //   // data.img プロパティが undefined かどうかをチェックし、空文字列に置き換える
    //   if (element.data && typeof element.data.img === 'undefined') {
    //       element.data.img = ''; // 空文字列に置き換える
    //   }
    // }
    // fs.writeFileSync(("data.json", JSON.stringify(elements, null, '    ')));

    // elements = databuilder.removeDuplicateNodes(elements);
    // elements.forEach(element => {if (element.data.id == "did:plc:6qbevqze2tlxtrhfisjpve6e") console.log("さざんか発見")});
    // console.log(elements.length);

    removeInvalidLinks(elements);
    // console.log(elements.length);
    // console.log(elements);
    
    return elements;

  } catch(e) {
    console.error(e);
  }
}