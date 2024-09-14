import { getData } from '$lib/server/router.js';

export const GET = async ({ url }) => {
  const handle = url.searchParams.get('handle');
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 進捗をクライアントに送信する関数
        const sendProgress = (progress) => {
          controller.enqueue(`data: ${JSON.stringify({ progress })}\n\n`);
        };

        const { elements, isFirstTime } = await getData(handle, sendProgress);
        console.log("[INFO] send data to client. total elements: " + elements.length);

        // 最終データを送信
        controller.enqueue(`data: ${JSON.stringify({ success: true, elements, isFirstTime })}\n\n`);
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
