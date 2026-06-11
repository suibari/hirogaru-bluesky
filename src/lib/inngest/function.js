import { inngest } from './inngest';
import { getElementsAndSetDb } from '$lib/server/router'; // getLatestPostsAndLikes と analyzeRecords は不要になったため削除
import { TimeLogger } from '$lib/server/logger';
import { db } from '$lib/server/postgres';

const ONE_HOUR_IN_MS = 60 * 60 * 1000;
const MAX_DISPATCH_COUNT = 20; // カスケード扇形展開を抑制するための上限

const THRESHOLD_TL_MAX = 1000;
const THRESHOLD_LIKES_MAX = 500;

// 単一ユーザーに対してgetElementsAndSetDbを実行するInngest関数
// 各ユーザーの処理時間を計測し、個別のInngestイベントとして実行する
export const processSingleUserWithGetElementsFunction = inngest.createFunction(
  {
    id: 'Process Single User With GetElementsAndSetDb',
    // handleごとに1時間1回のみ実行（超過分はキューに積み次の時間枠で処理）
    throttle: {
      key: 'event.data.userHandle',
      limit: 1,
      period: '1h',
    },
    // 全handle合計で同時実行数を制限しDBへの負荷を抑制
    concurrency: {
      limit: 10,
    },
  },
  { event: 'hirogaru/process.singleUser' }, // トリガーされるイベント名
  async ({ event }) => {
    const timeLogger = new TimeLogger();
    timeLogger.tic();

    const { userHandle } = event.data; // 処理対象のユーザーハンドルを取得

    console.log(`[INNGEST] SINGLE_USER: Executing getElementsAndSetDb for handle: ${userHandle}`);

    try {
      // 各ユーザーに対してgetElementsAndSetDbを実行
      await getElementsAndSetDb(userHandle, THRESHOLD_TL_MAX, THRESHOLD_LIKES_MAX, true);
      const executionTime = timeLogger.tac();
      console.log(`[INNGEST] SINGLE_USER: Successfully executed getElementsAndSetDb for ${userHandle}. Time: ${executionTime} [sec]`);
      return { success: true, handle: userHandle, time: executionTime };
    } catch (e) {
      const executionTime = timeLogger.tac();
      console.error(`[INNGEST] SINGLE_USER: Failed to execute getElementsAndSetDb for user ${userHandle}. Time: ${executionTime} [sec]`, e);
      return { success: false, handle: userHandle, error: e.message, time: executionTime };
    }
  }
);

// トップ50ユーザーに対して個別のInngest関数を呼び出し、並列処理を行うためのInngest関数
// Vercelの60秒制限に対応するため、各ユーザーの処理を個別のInngestイベントとして実行する
export const getElementsAndUpdateDbFunction = inngest.createFunction(
  { id: 'Dispatch User Processing' }, // ワークフローの名前
  { event: 'hirogaru/updateDb.elements' }, // トリガーされるイベント名
  async ({ event }) => {
    const timeLogger = new TimeLogger();
    timeLogger.tic();

    const { handle } = event.data; // ルートユーザーのハンドルを取得

    console.log(`[INNGEST] DISPATCHER: Executing for handle: ${handle}`);

    // DBから要素データを取得
    let data = [];
    try {
      data = await db.getElements(handle);
    } catch (e) {
      console.error(`[INNGEST] DISPATCHER: DB error fetching elements for ${handle}:`, e);
      return { success: false, error: e.message };
    }

    if (!data || data.length === 0) {
      console.warn(`[INNGEST] DISPATCHER: No elements found in DB for handle: ${handle}`);
      return { success: true, message: 'No elements found' };
    }

    // 'nodes' グループの要素をフィルタリング
    const nodes = data[0].elements.filter(element => (element.group === 'nodes'));

    // カスケード抑制のためディスパッチ上限をMAX_DISPATCH_COUNTに制限
    const candidateUsers = nodes.slice(0, MAX_DISPATCH_COUNT);

    if (candidateUsers.length === 0) {
      console.log(`[INNGEST] DISPATCHER: No 'nodes' found for handle: ${handle}`);
      return { success: true, message: 'No nodes found to process' };
    }

    // 既に新鮮なデータがある隣接ユーザーはスキップして不要なDB書き込みを回避
    const candidateHandles = candidateUsers.map(u => u.data.handle);
    let freshSet = new Set();
    try {
      const rows = await db.getElementsUpdatedAt(candidateHandles);
      const now = Date.now();
      for (const row of rows ?? []) {
        if (now - new Date(row.updated_at).getTime() < ONE_HOUR_IN_MS) {
          freshSet.add(row.handle);
        }
      }
    } catch (e) {
      console.warn('[INNGEST] DISPATCHER: staleness check failed, dispatching all:', e);
    }
    const usersToProcess = candidateUsers.filter(u => !freshSet.has(u.data.handle));

    if (usersToProcess.length === 0) {
      console.log(`[INNGEST] DISPATCHER: All top ${candidateUsers.length} nodes are fresh, skipping dispatch for handle: ${handle}`);
      return { success: true, message: 'All nodes are fresh' };
    }

    console.log(`[INNGEST] DISPATCHER: Found ${nodes.length} nodes, dispatching processing for ${usersToProcess.length}/${candidateUsers.length} stale nodes for handle: ${handle}`);

    // 各ユーザーに対して個別のInngest関数を呼び出すイベントを送信
    const sendPromises = usersToProcess.map(async (user) => {
      const userHandle = user.data.handle;
      console.log(`[INNGEST] DISPATCHER: Dispatching processSingleUser for ${userHandle}`);

      try {
        // 新しいInngest関数を呼び出すイベントを送信
        await inngest.send({ name: 'hirogaru/process.singleUser', data: { userHandle: userHandle } });
        console.log(`[INNGEST] DISPATCHER: Dispatched processSingleUser for ${userHandle}`);
        return { handle: userHandle, status: 'dispatched' };
      } catch (e) {
        console.error(`[INNGEST] DISPATCHER: Failed to dispatch processSingleUser for ${userHandle}:`, e);
        return { handle: userHandle, status: 'dispatch_failed', error: e.message };
      }
    });

    // 全ての送信処理が終わるのを待つ
    await Promise.all(sendPromises);

    console.log(`[INNGEST] DISPATCHER: Finished dispatching for handle: ${handle}. Execution time: ${timeLogger.tac()} [sec]`);
    return { success: true, dispatchedCount: usersToProcess.length };
  }
);

/*
// レコード解析を実行するInngest関数 (コメントアウトされたままにする)
export const analyzeRecordsFunction = inngest.createFunction(
  { id: `Analysis Records About A Handle` },
  { event: `hirogaru/updateDb.analyzeRecords` },
  async ({event}) => {
    const { handle, records } = event.data;

    const result = await analyzeRecords(records);
    const {data, error} = await supabase.from('records').upsert({
      handle: handle,
      records: records,
      result_analyze: result,
      updated_at: new Date()
    }).select();
    if (error) console.error("Error", error);
  }
);
*/
