import { inngest } from './inngest';
import { getElementsAndSetDb, getLatestPostsAndLikes } from '$lib/server/router';
import { analyzeRecords } from '$lib/server/databuilder';
import { TimeLogger } from '$lib/server/logger';
import { supabase } from '$lib/server/supabase';

const THRESHOLD_TL_MAX = 4000;
const THRESHOLD_LIKES_MAX = 1000;
const ELEM_NUM_PER_GROUP = 20;

// Inngestの関数を定義
export const getElementsAndUpdateDbFunction = inngest.createFunction(
  { id: 'Update Database By Elements' },  // ワークフローの名前
  { event: 'hirogaru/updateDb.elements' },         // トリガーされるイベント名
  async ({ event }) => {
    const { handle } = event.data;

    console.log(`[INNGEST] ELEM: Executing update elements: ${handle}`);

    try {
      await getElementsAndSetDb(handle, THRESHOLD_TL_MAX, THRESHOLD_LIKES_MAX, true);
      console.log(`[INNGEST] ELEM: Successfully updated DB for elements: ${handle}`);

      // ポスト収集イベントを駆動: elementを更新した後でないと、誰のポストを集めるかわからない
      await inngest.send({ name: 'hirogaru/updateDb.postsAndLikes.G0', data: { handle } });
      await inngest.send({ name: 'hirogaru/updateDb.postsAndLikes.G1', data: { handle } });

      return { success: true };
    } catch (e) {
      console.error(`[INNGEST] ELEM: Failed to update DB for elements: ${handle}`, e);
      return { success: false, error: e.message };
    }
  }
);

export function getPostsLikesAndUpdateDbFunction(group) {
  return inngest.createFunction(
    { id: `Update Database By Posts And Likes: G${group}` },
    { event: `hirogaru/updateDb.postsAndLikes.G${group}`},
    async ({event}) => {
      const timeLogger = new TimeLogger();
      timeLogger.tic();

      const { handle: handleCenter } = event.data;

      console.log(`[INNGEST] RECORDS G${group}: Executing get posts and likes: ${handleCenter}`);
      
      const {data, err} = await supabase.from('elements').select('elements').eq('handle', handleCenter);
      
      if (data.length === 1) {
        const nodes = data[0].elements.filter(element => (element.group === 'nodes'));
        const endIndex = Math.min(ELEM_NUM_PER_GROUP*(group+1), nodes.length);
        for (let i = ELEM_NUM_PER_GROUP*group; i < endIndex; i++) {
          const handleAround = nodes[i].data.handle;
          // console.log(`[INNGEST] RECORDS G${group}: get posts and likes: ${nodes[i].data.handle}`);

          try {
            const records = await getLatestPostsAndLikes(handleAround);

            // ポスト解析イベントを駆動: マルチスレッドで走らせないと60sに間に合わない
            await inngest.send({ name: 'hirogaru/updateDb.analyzeRecords', data: { handle: handleAround, records } });

          } catch (e) {
            console.error(`[INNGEST] RECORDS G${group}: Failed to get posts and likes: ${handleAround}`, e);
            return { success: false, error: e.message };
          }
        }

        console.log(`[INNGEST] RECORDS G${group}: exec time was ${timeLogger.tac()} [sec]: ${handleCenter}`);
        return { success: true };
      } else {
        console.warn(`[INNGEST] RECORDS G${group}: Cannot get elements from DB: ${handleCenter}`);
      }
    }
  );
}

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
