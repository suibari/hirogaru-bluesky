import { inngest } from './inngest';
import { getElementsAndSetDb, getLatestPostsAndLikesAndSetDb } from '$lib/server/router';
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

    console.log(`[INNGEST] ELEM: Executing getElementsAndUpdateDbFunction for elements: ${handle}`);

    try {
      await getElementsAndSetDb(handle, THRESHOLD_TL_MAX, THRESHOLD_LIKES_MAX, true);
      console.log(`[INNGEST] ELEM: Successfully updated DB for elements: ${handle}`);
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

      const { handle } = event.data;

      const {data, err} = await supabase.from('elements').select('elements').eq('handle', handle);
      
      if (data.length === 1) {
        const nodes = data[0].elements.filter(element => (element.group === 'nodes'));
        const endIndex = Math.min(ELEM_NUM_PER_GROUP*(group+1), nodes.length);
        for (let i = ELEM_NUM_PER_GROUP*group; i < endIndex; i++) {
          // console.log(`[INNGEST] RECORDS G${group}: get posts and likes: ${nodes[i].data.handle}`);

          try {
            await getLatestPostsAndLikesAndSetDb(nodes[i].data.handle);
            // console.log(`[INNGEST] RECORDS G${group}: Successfully get posts and likes: ${nodes[i].data.handle}`);
          } catch (e) {
            console.error(`[INNGEST] RECORDS G${group}: Failed to get posts and likes: ${nodes[i].data.handle}`, e);
            return { success: false, error: e.message };
          }
        }
        console.log(`[INNGEST] RECORDS G${group}: exec time was ${timeLogger.tac()} [sec]: ${handle}`);

        return { success: true };
      } else {
        console.warn(`[INNGEST] RECORDS: Cannot get elements from DB: ${handle}`, e);
      }
    }
  );
}

export function analyzeRecordsFunction(group) {
  return inngest.createFunction(
    { id: `Analysis Records About A Handle: ${group}` },
    { event: `hirogaru/updateDb.analyzeRecords.G${group}` },
    async ({event}) => {
      const timeLogger = new TimeLogger();
      timeLogger.tic();

      const { handle } = event.data;

      let {data, err} = await supabase.from('elements').select('elements').eq('handle', handle);

      if (data.length === 1) {
        const nodes = data[0].elements.filter(element => (element.group === 'nodes'));
        const endIndex = Math.min(ELEM_NUM_PER_GROUP*(group+1), nodes.length);
        for (let i = ELEM_NUM_PER_GROUP*group; i < endIndex; i++) {
          const handle = nodes[i].data.handle;

          ({data, err} = await supabase.from('records').select('records').eq('handle', handle));

          if (data.length === 1) {
            const result = await analyzeRecords(data[0].records);
            ({data, err} = await supabase.from('elements').upsert({handle: handle, result_analyze_records: result, updated_at: new Date()}).select());
            if (err) console.error("Error", err);

            // console.log(`[INNGEST] ANALYZE G${group}: Successfully analyze: ${handle}`);
          }
        }
        console.log(`[INNGEST] ANALYZE G${group}: exec time was ${timeLogger.tac()} [sec]: ${handle}`);

        return { success: true };
      } else {
        console.warn(`[INNGEST] ANALYZE: Cannot get elements from DB: ${handle}`, e);
      }
    }
  );
}
