import { BSKY_IDENTIFIER, BSKY_APP_PASSWORD } from '$env/static/private';
import { MyBlueskyer } from '$lib/server/bluesky.js';
import { getElements, removeDuplicatesNodes, removeInvalidLinks, imageUrlToBase64 } from '$lib/server/databuilder.js';
import { TimeLogger, ExecutionLogger } from '$lib/server/logger.js';
import { kv } from '$lib/server/vercel_kv.js';
const agent = new MyBlueskyer();

const THRESHOLD_NODES = 36
const THRESHOLD_TL_TMP = 200;
const THRESHOLD_LIKES_TMP = 20;
const SCORE_REPLY = 10;
const SCORE_LIKE = 1;
const MAX_RADIUS = 10;

export async function getData(handle) {
  try {
    // DBにデータがあればそれを出しつつ裏で更新、なければデータ収集しセット
    let isFirstTime = false;
    let elements = await kv.get(handle);
    if (elements === null) {
      // データがないので同期処理で待って最低限のデータを渡す
      elements = await getElementsAndSetDb(handle, THRESHOLD_TL_TMP, THRESHOLD_LIKES_TMP, false);
      isFirstTime = true;
    }

    // DBには画像URLを入れているので、クライアント送信前にそれをbase64URIに変換
    await Promise.all(elements.map(async elem => {
      if (elem.group === 'nodes') {
        elem.data.img = await imageUrlToBase64(elem.data.img);
      }
    }));
    
    // console.log(elements.length, isFirstTime);
    return {elements: elements, isFirstTime: isFirstTime};

  } catch(e) {
    throw e;
  }
}

export async function getElementsAndSetDb(handle, threshold_tl, threshold_like, setDbEn) {
  const timeLogger = new TimeLogger();
  timeLogger.tic();

  await agent.createOrRefleshSession(BSKY_IDENTIFIER, BSKY_APP_PASSWORD);

  let response;
  response = await agent.getProfile({actor: handle});
  const myselfWithProf = response.data;

  // 自分のタイムラインTHRESHOLD_TL件および自分のいいねTHRESHOLD_LIKES件を取得
  let friendsWithProf = await agent.getInvolvedEngagements(handle, threshold_tl, threshold_like, SCORE_REPLY, SCORE_LIKE);

  // 要素数がTHRESHOLD_NODESに満たなければ、相互フォロー追加
  let didArray;
  if (friendsWithProf.length < THRESHOLD_NODES) {
    response = await agent.getFollows({actor: handle, limit: 50});
    const follows = response.data.follows;
    didArray = follows.map(follow => follow.did);
    const mutualWithProf = await agent.getConcatProfiles(didArray);
    friendsWithProf = friendsWithProf.concat(mutualWithProf);
  };

  // 重複ノード削除: getElementsより先にやらないとnodesがTHRESHOLD_NODESより少なくなる
  const allWithProf = removeDuplicatesNodes(myselfWithProf, friendsWithProf);

  // あまりに大きい相関図を送ると通信料がえげつないのでMAX_RADIUS段でクリップする
  const slicedAllWithProf = allWithProf.slice(0, 1 + 3 * (MAX_RADIUS-1) * ((MAX_RADIUS-1) + 1));

  // node, edge取得
  let elements = await getElements(slicedAllWithProf);

  // 不要エッジ除去
  removeInvalidLinks(elements);

  // DBセット
  if (setDbEn) {
    kv.set(handle, elements);
  }

  console.log(`[WORKER] exec time was ${timeLogger.tac()} [sec]: ${handle}`);

  return elements;
}

export async function doSearchActors(query) {
  const params = {q: query};
  await agent.createOrRefleshSession(BSKY_IDENTIFIER, BSKY_APP_PASSWORD);
  const response = await agent.searchActors(params);
  const actors = response.data.actors;
  return actors;
}