const MyBskyAgent = require('./src/bluesky');
const databuilder = require('./src/databuilder');
const express = require('express');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(express.static('./'));
app.get('/data', async (req, res) => {
  try {
    const data = await getData();
    res.json(data);
    console.log("send data to client.")
  } catch (e) {
    res.status(500);
  }
})
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
})

async function getData() {
  const FF_THRESHOLD = 1000;
  const NODE_LIMIT = 5000;
  const handleordid = "suibari-cha.bsky.social";

  const agent = new MyBskyAgent();

  try {
    await agent.login({
      identifier: process.env.BSKY_IDENTIFIER,
      password: process.env.BSKY_APP_PASSWORD
    });
    // 1st depth
    const response = await agent.getProfile({actor: handleordid});
    const follows = await agent.getConcatFollows(handleordid);
    const followers = await agent.getConcatFollowers(handleordid);
    let elements = await databuilder.getNodesAndLinks(response.data, follows, followers);
    console.log("complete myself");
    // 2nd~ depth
    for (const follow of follows) {
      const response = await agent.getProfile({actor: follow.did});
      // console.log(response.data)
      if ((response.data.followsCount < FF_THRESHOLD) && (response.data.followersCount < FF_THRESHOLD)) {
        console.log("start follow: "+follow.displayName);
        // follow
        const followOfFollows = await agent.getConcatFollows(follow.did);
        const followOfFollowers = await agent.getConcatFollowers(follow.did);
        const dataOfFollows = await databuilder.getNodesAndLinks(follow, followOfFollows, followOfFollowers);
        elements = elements.concat(dataOfFollows);
        console.log("complete follow: "+follow.displayName);
      }
    };
    for (const follower of followers) {
      const response = await agent.getProfile({actor: follower.did});
      if ((response.data.followsCount < FF_THRESHOLD) && (response.data.followersCount < FF_THRESHOLD)) {
        console.log("start follower: "+follower.displayName);
        // follower
        const followerOfFollows = await agent.getConcatFollows(follower.did);
        const followerOfFollowers = await agent.getConcatFollowers(follower.did);
        const dataOfFollowers = await databuilder.getNodesAndLinks(follower, followerOfFollows, followerOfFollowers);
        elements = elements.concat(dataOfFollowers);
        console.log("complete follow: "+follower.displayName);
      }
    };
    console.log(elements.length);
    
    // ファイル保存
    // for (const element of elements) {
    //   // data.img プロパティが undefined かどうかをチェックし、空文字列に置き換える
    //   if (element.data && typeof element.data.img === 'undefined') {
    //       element.data.img = ''; // 空文字列に置き換える
    //   }
    // }
    // fs.writeFileSync(("data.json", JSON.stringify(elements, null, '    ')));

    elements = databuilder.removeDuplicateAndLimitNodes(elements, NODE_LIMIT);
    console.log(elements.length);

    databuilder.removeInvalidLinks(elements);
    console.log(elements.length);
    
    return elements;

  } catch(e) {
    console.error(e);
  }
}