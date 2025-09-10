import { inngest } from './inngest';
import { getElementsAndSetDb } from '$lib/server/router'; // getLatestPostsAndLikes と analyzeRecords は不要になったため削除
import { TimeLogger } from '$lib/server/logger';
import { supabase } from '$lib/server/supabase';

const THRESHOLD_TL_MAX = 1000;
const THRESHOLD_LIKES_MAX = 500;

// 単一ユーザーに対してgetElementsAndSetDbを実行するInngest関数
// 各ユーザーの処理時間を計測し、個別のInngestイベントとして実行する
export const processSingleUserWithGetElementsFunction = inngest.createFunction(
  { id: 'Process Single User With GetElementsAndSetDb' }, // ワークフローの名前
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

    // Supabaseから要素データを取得
    const { data, error } = await supabase.from('elements').select('elements').eq('handle', handle);

    if (error) {
      console.error(`[INNGEST] DISPATCHER: Supabase error fetching elements for ${handle}:`, error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.warn(`[INNGEST] DISPATCHER: No elements found in DB for handle: ${handle}`);
      return { success: true, message: 'No elements found' };
    }

    // 'nodes' グループの要素をフィルタリング
    const nodes = data[0].elements.filter(element => (element.group === 'nodes'));

    // トップ50ユーザーまでを処理対象とする
    const usersToProcess = nodes.slice(0, 50);

    if (usersToProcess.length === 0) {
      console.log(`[INNGEST] DISPATCHER: No 'nodes' found for handle: ${handle}`);
      return { success: true, message: 'No nodes found to process' };
    }

    console.log(`[INNGEST] DISPATCHER: Found ${nodes.length} nodes, dispatching processing for top ${usersToProcess.length} for handle: ${handle}`);

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
