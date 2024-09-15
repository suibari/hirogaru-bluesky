import { BSKY_IDENTIFIER, BSKY_APP_PASSWORD, HIROGARU_SECRET_KEY } from '$env/static/private';
import * as crypto from 'crypto';
import { MyBlueskyer } from '$lib/server/bluesky.js';
import { getElements, removeDuplicatesNodes, removeInvalidLinks, imageUrlToBase64, analyseRecords } from '$lib/server/databuilder.js';
import { TimeLogger, ExecutionLogger } from '$lib/server/logger.js';
import { supabase } from './supabase';
const agent = new MyBlueskyer();

const THRESHOLD_NODES = 36
const THRESHOLD_TL_TMP = 200;
const THRESHOLD_LIKES_TMP = 20;
const SCORE_REPLY = 10;
const SCORE_LIKE = 1;
const MAX_RADIUS = 10;
const NUM_ANALYSIS = 37;
const PERCENT_CALC_ENGAGEMENT = 30;
const PERCENT_PREPARE_ELEMENT = 60;
const PERCENT_BASE64_CONVERT = 100;
const ONE_HOUR_IN_MS = 60 * 60 * 1000;
const RETRY_COUNT_GET_ELEM = 3;

export async function getData(handle, progressCallback) {
  try {
    let elements;

    // DBにデータがあればそれを出しつつ裏で更新、なければデータ収集しセット
    let isFirstTime = false;
    let isExecBgProcess = false;
    let {data, error} = await supabase.from('elements').select('elements, updated_at').eq('handle', handle);

    if (data.length === 0) {
      // データがないので同期処理で待って最低限のデータを渡す
      elements = await getElementsAndSetDb(handle, THRESHOLD_TL_TMP, THRESHOLD_LIKES_TMP, false, progressCallback);
      isFirstTime = true;
      isExecBgProcess = true;

    } else {
      elements = data[0].elements;

      // バックグラウンド処理開始判定
      const updatedAt = new Date(data[0].updated_at);
      const currentTime = new Date();
      const timeDiff = currentTime - updatedAt;
      if (timeDiff > ONE_HOUR_IN_MS) {
        isExecBgProcess = true;
      }
    }

    // 解析データセット
    const nodes = elements.filter(element => (element.group === 'nodes'));
    const handles = nodes.map(node => node.data.handle);
    ({data, error} = await supabase.from('records').select('handle, result_analyze').in('handle', handles)); // 周辺ユーザの解析データ取得
    if (data.length > 0) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        const match = data.find(row => row.handle === node.data.handle);
        if (match) {
          node.data.activeHistgram = match.result_analyze.activeHistgram;
          node.data.averageInterval = match.result_analyze.averageInterval;
          node.data.lastActionTime = match.result_analyze.lastActionTime;
          node.data.wordFreqMap = match.result_analyze.wordFreqMap;
        }
        
        // 進捗をiに応じて加算
        const progress = Math.floor(((i+1) / nodes.length) * PERCENT_PREPARE_ELEMENT);
        if (progressCallback) progressCallback(progress);
      }
    }

    // DBには画像URLを入れているので、クライアント送信前にそれをbase64URIに変換
    // 指定したミリ秒だけ待つ関数
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    // imageUrlToBase64を10msおきに実行する
    await Promise.all(nodes.map(async (node, index) => {
      await delay(index*10);
      node.data.img = await imageUrlToBase64(node.data.img);
      
      // 進捗をiに応じて加算
      const progress = Math.floor(((index+1) / nodes.length) * (PERCENT_BASE64_CONVERT - PERCENT_PREPARE_ELEMENT) + PERCENT_PREPARE_ELEMENT);
      if (progressCallback) progressCallback(progress);
    }));

    // 処理完了 (100%進捗)
    if (progressCallback) progressCallback(100);
    
    // console.log(elements.length, isFirstTime);
    return {elements, isFirstTime, isExecBgProcess};

  } catch(e) {
    throw e;
  }
}

export async function getElementsAndSetDb(handle, threshold_tl, threshold_like, setDbEn, progressCallback) {
  const timeLogger = new TimeLogger();
  timeLogger.tic();

  // 再試行回数
  let attempts = 0;

  while (attempts < RETRY_COUNT_GET_ELEM) {
    try {
      attempts++;
      await agent.createOrRefleshSession(BSKY_IDENTIFIER, BSKY_APP_PASSWORD);

      let response;
      response = await agent.getProfile({actor: handle});
      const myselfWithProf = response.data;

      // 自分のタイムラインTHRESHOLD_TL件および自分のいいねTHRESHOLD_LIKES件を取得
      let friendsWithProf = await agent.getInvolvedEngagements(handle, threshold_tl, threshold_like, SCORE_REPLY, SCORE_LIKE);

      // 進捗
      if (progressCallback) progressCallback(PERCENT_CALC_ENGAGEMENT);

      // 要素数がTHRESHOLD_NODESに満たなければ、相互フォロー追加
      let didArray;
      if (friendsWithProf.length < THRESHOLD_NODES) {
        response = await agent.getFollows({actor: handle, limit: 50});
        const follows = response.data.follows;
        didArray = follows.map(follow => follow.did);
        const mutualWithProf = await agent.getConcatProfiles(didArray);
        friendsWithProf = friendsWithProf.concat(mutualWithProf);
      }

      // 重複ノード削除: getElementsより先にやらないとnodesがTHRESHOLD_NODESより少なくなる
      const allWithProf = removeDuplicatesNodes(myselfWithProf, friendsWithProf);

      // あまりに大きい相関図を送ると通信料がえげつないのでMAX_RADIUS段でクリップする
      const slicedAllWithProf = allWithProf.slice(0, 1 + 3 * (MAX_RADIUS - 1) * ((MAX_RADIUS - 1) + 1));

      // node, edge取得
      let elements = await getElements(slicedAllWithProf);

      // 不要エッジ除去
      removeInvalidLinks(elements);

      // DBセット
      if (setDbEn) {
        const { data, err } = await supabase.from('elements').upsert({ handle: handle, elements: elements, updated_at: new Date() }).select();
        if (err) console.error("Error", err);
      }

      // 進捗
      if (progressCallback) progressCallback(PERCENT_PREPARE_ELEMENT);

      console.log(`[WORKER] exec time was ${timeLogger.tac()} [sec]: ${handle}`);

      return elements;
    } catch (error) {
      console.error(`Attempt ${attempts} failed: ${error}`);
      if (attempts >= RETRY_COUNT_GET_ELEM) {
        throw new Error('Max retry attempts reached');
      }
    }
  }
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
      
      const {err} = await supabase.from('sessions').insert({
        session_id: sessionId,
        user_info: {
          handle: handle,
          iv_with_encrypted: ivWithEncrypted,
          expirarion: expirarion.getTime(),
        },
      });
      
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
    const response = await supabase.from('sessions').delete().eq('session_id', sessionId).select();
    
    if (response.status === 200) {
      console.log(`[INFO] Deleted session ID: ${response.data[0].sessionId}, ${response.data[0].handle}`);
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
    const {data, err} = await supabase.from('sessions').select('user_info').eq('session_id', sessionId);
    if (data.length === 1) {
      const userInfo = data[0].user_info;
      if (userInfo && new Date() < new Date(userInfo.expirarion)) {
        return { success: true, handle: userInfo.handle, ivWithEncrypted: userInfo.iv_with_encrypted };
      } else {
        // セッションIDはあるが、期限切れなので削除
        const response = await supabase.from('sessions').delete().eq('session_id', sessionId).select();
        console.log(`[INFO] Deleted session ID: ${response.data[0].sessionId}, ${response.data[0].handle}`);
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

export async function getLatestPostsAndLikes(handle) {
  let response;

  await agent.createOrRefleshSession(BSKY_IDENTIFIER, BSKY_APP_PASSWORD);

  // ポスト100件取得
  response = await agent.listRecords({repo: handle, collection: "app.bsky.feed.post", limit: 100}).catch(e => {
    console.error(e);
    console.warn(`[WARN] fetch error handle: ${handle}, so set empty object`);
    return { records: [] };
  });
  const postRecords = response.records;

  // いいね100件取得
  response = await agent.listRecords({repo: handle, collection: "app.bsky.feed.like", limit: 100}).catch(e => {
    console.error(e);
    console.warn(`[WARN] fetch error handle: ${handle}, so set empty object`);
    return { records: [] };
  });
  const likeRecords = response.records;

  const records = {
    posts: postRecords,
    likes: likeRecords,
  }
  
  return records;
}
