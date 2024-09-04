import { inngest } from './inngest';
import { getElementsAndSetDb } from '$lib/server/router.js';

// Inngestの関数を定義
export const updateDbFunction = inngest.createFunction(
  { id: 'UpdateDatabase' },  // ワークフローの名前
  { event: 'hirogaru/update.db' },         // トリガーされるイベント名
  async ({ event }) => {
    const { handle } = event.data;

    console.log(`[INNGEST] Executing getElementsAndSetDb for handle: ${handle}`);

    try {
      await getElementsAndSetDb(handle, true);
      console.log(`[INNGEST] Successfully updated DB for handle: ${handle}`);
      return { success: true };
    } catch (e) {
      console.error(`[INNGEST] Failed to update DB for handle: ${handle}`, e);
      return { success: false, error: e.message };
    }
  }
);
