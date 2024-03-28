import { BSKY_IDENTIFIER, BSKY_APP_PASSWORD } from '$env/static/private';
import { MyBlueskyer } from '$lib/server/bluesky.js';
import { getElements, removeDuplicatesNodes, removeInvalidLinks } from '$lib/server/databuilder.js';
import { TimeLogger, ExecutionLogger } from '$lib/server/logger.js';
const agent = new MyBlueskyer();
const execLogger = new ExecutionLogger();

export async function getData(handle) {
  const THRESHOLD_NODES = 36
  const THRESHOLD_TL = 1000;
  const THRESHOLD_LIKES = 100;
  const SCORE_REPLY = 10;
  const SCORE_LIKE = 1;

  try {
    const timeLogger = new TimeLogger();
    timeLogger.tic();

    await agent.createOrRefleshSession(BSKY_IDENTIFIER, BSKY_APP_PASSWORD);

    let response;
    response = await agent.getProfile({actor: handle});
    const myselfWithProf = response.data;

    // 自分のタイムラインTHRESHOLD_TL件および自分のいいねTHRESHOLD_LIKES件を取得
    let friendsWithProf = await agent.getInvolvedEngagements(handle, THRESHOLD_TL, THRESHOLD_LIKES, SCORE_REPLY, SCORE_LIKE);

    // 要素数がTHRESHOLD_NODESに満たなければ、相互フォロー追加
    let didArray;
    if (friendsWithProf.length < THRESHOLD_NODES) {
      response = await agent.getFollows({actor: handle, limit: 50});
      const follows = response.data.follows;
      didArray = follows.map(follow => follow.did);
      const mutualWithProf = await agent.getConcatProfiles(didArray);
      friendsWithProf = friendsWithProf.concat(mutualWithProf);
    };
    
    // フォロー検出
    didArray = friendsWithProf.map(friend => friend.did);
    const objFollow = await agent.isFollow(myselfWithProf.did, didArray);
    for (const obj of objFollow) {
      for (const friend of friendsWithProf) {
        if (friend.did == obj.did) {
          friend.following = obj.following
        };
      };
    };
    
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