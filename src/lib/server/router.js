import { BSKY_IDENTIFIER, BSKY_APP_PASSWORD, HIROGARU_SECRET_KEY } from '$env/static/private';
import * as crypto from 'crypto';
import { MyBlueskyer } from '$lib/server/bluesky.js';
import { getElements, removeDuplicatesNodes, removeInvalidLinks, imageUrlToBase64 } from '$lib/server/databuilder.js';
import { TimeLogger, ExecutionLogger } from '$lib/server/logger.js';
import { docClient, GET_ELEMENTS, GET_USER_USERINFO, UPDATE_ELEMENTS, UPDATE_USER_USERINFO, DELETE_USER_USERINFO } from './dynamodb';
const agent = new MyBlueskyer();

const THRESHOLD_NODES = 36
const THRESHOLD_TL_TMP = 200;
const THRESHOLD_LIKES_TMP = 20;
const SCORE_REPLY = 10;
const SCORE_LIKE = 1;
const MAX_RADIUS = 10;

export async function getData(handle) {
  try {
    let elements;

    // DBにデータがあればそれを出しつつ裏で更新、なければデータ収集しセット
    let isFirstTime = false;
    let result = await docClient.get(GET_ELEMENTS(handle)).promise();
    if (!result.Item) {
      // データがないので同期処理で待って最低限のデータを渡す
      elements = await getElementsAndSetDb(handle, THRESHOLD_TL_TMP, THRESHOLD_LIKES_TMP, false);
      isFirstTime = true;
    } else {
      elements = result.Item.elements;
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
    await docClient.update(UPDATE_ELEMENTS(handle, elements), (err) => {
      if (err) console.error("Error", err);
    }).promise();
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

export async function createSession(handle, password) {
  try {
    const userAgent = new MyBlueskyer();

    const response = await userAgent.login({
      identifier: handle,
      password: password
    });
    if (response.success) {
      console.log(`[INFO] success to log in: ${handle}`);
      const accessJwtBsky = response.data.accessJwt;
      const refreshJwtBsky = response.data.refreshJwt;

      // パスワード暗号化
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', HIROGARU_SECRET_KEY, iv);
      let encrypted = cipher.update(password, 'utf-8', 'hex');
      encrypted += cipher.final('hex');
      const ivWithEncrypted = iv.toString('hex') + ':' + encrypted;

      // セッションID生成
      const sessionId = crypto.randomUUID();

      // セッション有効期限を設定
      const expirarion = new Date();
      expirarion.setFullYear(expirarion.getFullYear() + 1); // 1年後
      
      await docClient.update(UPDATE_USER_USERINFO(handle, ivWithEncrypted, accessJwtBsky, refreshJwtBsky, sessionId, expirarion.getTime())).promise();

      return sessionId;
    } else {
      return null;
    }
  } catch (e) {
    throw e;
  }
}

export async function deleteSession(sessionId) {
  try {
    const result = await docClient.delete(DELETE_USER_USERINFO(sessionId)).promise();
    
    if (result.Attributes) {
      console.log(`[INFO] Deleted session ID: ${sessionId}, ${result.Attributes.userInfo.handle}`);
      return true;
    } else {
      return false;
    }
  } catch (e) {
    throw e;
  }
}

export async function verifyUser(sessionId) {
  try {
    // DBからハンドル名と暗号化パスワード取得
    const result = await docClient.get(GET_USER_USERINFO(sessionId)).promise();
    if (result.Item) {
      const userInfo = result.Item.userInfo;
      if (userInfo && new Date() < new Date(userInfo.expirarion)) {
        return { success: true, handle: userInfo.handle, ivWithEncrypted: userInfo.ivWithEncrypted };
      } else {
        // セッションIDはあるが、期限切れなので削除
        await docClient.delete(DELETE_USER_USERINFO(sessionId)).promise();
        return { success: false };
      }
    } else {
      return { success: false };
    }
  } catch (e) {
    throw e;
  }
}

export async function verifyUserAndPostBsky(sessionId, text, imgBlob) {
  try {
    const result = await verifyUser(sessionId);

    if (result.success) {
      // パスワード復号
      const [ivHex, encrypted] = result.ivWithEncrypted.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', HIROGARU_SECRET_KEY, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');

      const userAgent = new MyBlueskyer();
      const response = await userAgent.login({
        identifier: result.handle,
        password: decrypted,
      });
      await userAgent.postWithImage(text, imgBlob);
    }
  } catch (e) {
    throw e;
  }
}
