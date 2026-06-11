import { getData } from '$lib/server/router.js';
import { inngest } from '$lib/inngest/inngest.js';

const CRAWLER_UA = /Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|Slurp|AhrefsBot|SemrushBot|MJ12bot|facebot|Twitterbot|LinkedInBot/i;

export const GET = async ({ url, request }) => {
  const receivedHandle = url.searchParams.get('handle');

  // エスケープ処理
  const handle = receivedHandle.replace(/[@＠]/g, '');

  const isCrawler = CRAWLER_UA.test(request.headers.get('user-agent') ?? '');

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 進捗をクライアントに送信する関数
        const sendProgress = (progress) => {
          controller.enqueue(`data: ${JSON.stringify({ progress })}\n\n`);
        };

        const { elements, isFirstTime, isExecBgProcess } = await getData(handle, sendProgress);
        console.log("[INFO] send data to client. total elements: " + elements.length);

        // Inngestトリガー（クローラーからのアクセスはスキップ）
        if (((isExecBgProcess) || process.env.NODE_ENV !== 'production') && !isCrawler) {
          // 同一時間内の重複イベントをInngest側で排除するためidキーを付与
          const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
          if (isFirstTime) {
            // 初回ユーザーはデータを作成して保存する
            await inngest.send({ id: `process-${handle}-${hourBucket}`, name: 'hirogaru/process.singleUser', data: { userHandle: handle } });
          } else {
            // 既存ユーザーはネイバーの更新などをディスパッチ
            await inngest.send({ id: `updatedb-${handle}-${hourBucket}`, name: 'hirogaru/updateDb.elements', data: { handle } });
          }
          console.log("[INFO] Inngest event sent.");
        } else if (isCrawler) {
          console.log("[INFO] Crawler detected, skipping Inngest dispatch.");
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
