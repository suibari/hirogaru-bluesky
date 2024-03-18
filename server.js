const { Blueskyer } = require('blueskyer');
const { getElements, removeDuplicatesNodes } = require('./src/databuilder.js');
const { TimeLogger, ExecutionLogger } = require('./src/logger.js');
const { addTextToImage } = require('./src/imgshaper.js')
const express = require('express');
const path = require('path');
const multer  = require('multer');
const upload = multer();
const agent = new Blueskyer();
const execLogger = new ExecutionLogger();

const app = express();
const port = process.env.PORT || 7860;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/generate', async (req, res) => {
  try {
    const handle = req.query.handle;
    console.log("[INFO] receive query from client. handle: "+handle);
    const data = await getData(handle);
    res.json(data);
    console.log("[INFO] send data to client. total elements: "+data.length);
  } catch (e) {
    console.log("[ERROR] An error occured: ", e);
    res.status(500).send({error: "Internal Server Error", message: e.message});
  }
});
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const blob = req.file.buffer;
    // console.log(blob);
    
    const base64 = await addTextToImage(blob);
    // console.log(base64);

    res.json({uri: base64});
    console.log("[INFO] send image data to client.");
  } catch(e) {
    console.log("[ERROR] An error occured: ", e);
    res.status(500).send({error: "Internal Server Error", message: e.message});
  }
});
app.listen(port, () => {
  console.log(`[INFO] Server is running on http://localhost:${port}`);
})

async function getData(handle) {
  const THRESHOLD_NODES = 36
  const THRESHOLD_TL = 1000;
  const THRESHOLD_LIKES = 100;
  const SCORE_REPLY = 10;
  const SCORE_LIKE = 1;
  const RANK_LOWEST = 20;

  try {
    const timeLogger = new TimeLogger();
    timeLogger.tic();

   await agent.createOrRefleshSession();

    let response;
    response = await agent.getProfile({actor: handle});
    const myselfWithProf = response.data;

    // 自分のタイムラインTHRESHOLD_TL件および自分のいいねTHRESHOLD_LIKES件を取得
    let friendsWithProf = await agent.getInvolvedEngagements(handle, THRESHOLD_NODES, THRESHOLD_TL, THRESHOLD_LIKES, SCORE_REPLY, SCORE_LIKE);

    // フォロー検出
    let didArray;
    didArray = friendsWithProf.map(friend => friend.did);
    const objFollow = await agent.isFollow(myselfWithProf.did, didArray);
    for (const obj of objFollow) {
      for (const friend of friendsWithProf) {
        if (friend.did == obj.did) {
          friend.following = obj.following
          break;
        };
      };
    };

    // 要素数がTHRESHOLD_NODESに満たなければ、相互フォロー追加
    if (friendsWithProf.length < THRESHOLD_NODES) {
      response = await agent.getFollows({actor: handle, limit: 100});
      const follows = response.data.follows;
      didArray = follows.map(follow => follow.did);
      const objMutual = await agent.isMutual(myselfWithProf.did, didArray);
      didArray = objMutual.filter(obj => obj.mutual).map(obj => obj.did);
      didArray = didArray.splice(0, 25); // getProfilesの制限回避
      response = await agent.getProfiles({actors: didArray});
      const mutualWithProf = response.data.profiles;
      // エンゲージメントを最低値で埋めておく
      for (const mutual of mutualWithProf) {
        mutual.engagement = RANK_LOWEST;
      };
      friendsWithProf = friendsWithProf.concat(mutualWithProf);
    }
    
    // 重複ノード削除: getElementsより先にやらないとnodesがTHRESHOLD_NODESより少なくなる
    const allWithProf = removeDuplicatesNodes(myselfWithProf, friendsWithProf);

    // node, edge取得
    let elements = await getElements(allWithProf, objFollow);

    execLogger.incExecCount();
    const elapsedTime = timeLogger.tac();
    const execCount = execLogger.getExecCount();
    console.log("[INFO] exec time was " + elapsedTime + " [sec], total exec count is " + execCount + ".");
    
    // console.log(elements);
    return elements;

  } catch(e) {
    throw e;
  }
}