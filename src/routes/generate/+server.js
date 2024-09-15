import { getData } from '$lib/server/router.js';
import { inngest } from '$lib/inngest/inngest.js';

export const GET = async ({ url }) => {
  const receivedHandle = url.searchParams.get('handle');

  // エスケープ処理
  const handle = receivedHandle.replace(/[@＠]/g, '');
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 進捗をクライアントに送信する関数
        const sendProgress = (progress) => {
          controller.enqueue(`data: ${JSON.stringify({ progress })}\n\n`);
        };

        const { elements, isFirstTime, isExecBgProcess } = await getData(handle, sendProgress);
        console.log("[INFO] send data to client. total elements: " + elements.length);

        // Inngestトリガー
        if (isExecBgProcess) {
          await inngest.send({ name: 'hirogaru/updateDb.elements', data: { handle } });
          console.log("[INFO] Inngest event sent.");
        }

        // 最終データを送信
        controller.enqueue(`data: ${JSON.stringify({ success: true, elements, isFirstTime, isExecBgProcess })}\n\n`);
        controller.close();
      } catch (e) {
        console.error("[ERROR] An error occurred: ", e);
        controller.error(e);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
