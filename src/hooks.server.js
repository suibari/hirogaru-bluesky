// src/hooks.server.js
import { Agent } from 'undici';
import { verifyUser } from '$lib/server/router';

// Create an undici agent with autoSelectFamily option
const agent = new Agent({
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 30_000,
  autoSelectFamily: true
});

// Override fetch function globally
export const handleFetch = async ({ request, fetch }) => {
  // Clone the request and set the agent
  const newRequest = new Request(request, {
    agent
  });

  // Call the original fetch with the modified request
  return fetch(newRequest);
};

// リクエストごとにセッションIDを検証する
export const handle = async ({ event, resolve }) => {
  try {
    // クッキーからセッションID取得
    const sessionId = event.cookies.get('sessionId');
    if (sessionId) {
      const result = await verifyUser(sessionId);
      if (result) {
        console.log(sessionId, result);

        event.locals.isLoggedIn = true;
      } else {
        event.locals.isLoggedIn = false;
      }
    }
    return resolve(event);
    
  } catch (e) {
    console.error("[ERROR] An error occured: ", e);
    error(500, { message: e.error });
  }
};
