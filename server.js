const { MyBskyAgent } = require('blueskyer');
const { getElements, removeInvalidLinks, removeDuplicatesNodes } = require('./src/databuilder.js');
const Logger = require('./src/logger.js');
const express = require('express');
const path = require('path');
const multer  = require('multer');
const upload = multer();
const agent = new MyBskyAgent();
const logger = new Logger();

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
  const THRESHOLD_LIKES = 20;

  try {
    logger.tic();

    await agent.createOrRefleshSession();

    let response = await agent.getProfile({actor: handle});
    const myselfWithProf = response.data;

    // 自分のタイムラインTHRESHOLD_TL件および自分のいいねTHRESHOLD_LIKES件を取得
    const friendsWithProf = await agent.getArraySortedReplyToAndLikeCount(handle, THRESHOLD_NODES, THRESHOLD_TL, THRESHOLD_LIKES);

    // 重複ノード削除: getElementsより先にやらないとnodesがTHRESHOLD_NODESより少なくなる
    const allWithProf = removeDuplicatesNodes(myselfWithProf, friendsWithProf);

    // node, edge取得
    let elements = await getElements(allWithProf);

    logger.incExecCount();
    const elapsedTime = logger.tac();
    const execCount = logger.getExecCount();
    console.log("[INFO] exec time was " + elapsedTime + " [sec], total exec count is " + execCount + ".");
    
    return elements;

  } catch(e) {
    throw e;
  }
}