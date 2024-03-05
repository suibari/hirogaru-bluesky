const MyBskyAgent = require('./src/bluesky.js');
const { getElements, removeInvalidLinks, removeDuplicatesNodes } = require('./src/databuilder.js');
const express = require('express');
const multer  = require('multer');
const upload = multer();
const agent = new MyBskyAgent();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('./'));
app.get('/generate', async (req, res) => {
  try {
    const handle = req.query.handle;
    console.log("[INFO] receive query from client. handle: "+handle);
    const data = await getData(handle);
    res.json(data);
    console.log("[INFO] send data to client. total elements: "+data.length);
  } catch (e) {
    res.status(500);
  }
});
// app.post('/upload', upload.single('image'), async (req, res) => {
//   const blob = req.file.buffer;
//   // console.log(blob)
//   const uint8Array = new Uint8Array(blob);
//   // console.log(uint8Array)
//   const response = await agent.uploadBlob(uint8Array, {encoding: 'image/png'});

//   res.json({uri: response.data.blob});
// });
app.listen(port, () => {
  console.log(`[INFO] Server is running on http://localhost:${port}`);
})

async function getData(handle) {
  const THRESHOLD_NODES = 36
  const THRESHOLD_TL = 1000;
  const THRESHOLD_LIKES = 100;

  try {
    await agent.createOrRefleshSession();

    let response = await agent.getProfile({actor: handle});
    if ((response.status == 400) && (response.data.message == "Profile not found")) {
      throw new Error('profile-not-found');
    }
    const myselfWithProf = response.data;

    // 自分のタイムラインTHRESHOLD_TL件および自分のいいねTHRESHOLD_LIKES件を取得
    const friendsWithProf = await agent.getArraySortedReplyToAndLikeCount(handle, THRESHOLD_NODES, THRESHOLD_TL, THRESHOLD_LIKES);

    // 重複ノード削除: getElementsより先にやらないとnodesがTHRESHOLD_NODESより少なくなる
    const allWithProf = removeDuplicatesNodes(myselfWithProf, friendsWithProf);

    // node, edge取得
    let elements = await getElements(allWithProf);
    
    return elements;

  } catch(e) {
    console.error(e);
  }
}