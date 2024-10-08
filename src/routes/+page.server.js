import { NODE_ENV } from '$env/static/private';
import { getData, doSearchActors, createSession, deleteSession, verifyUserAndPostBsky } from '$lib/server/router.js';
import { error } from '@sveltejs/kit';
import { verifyUser } from '../lib/server/router.js';

export const actions = {
  post: async ({ request, cookies }) => {
    try {
      const data = await request.formData();
      const text = data.get('text');
      const blob = data.get('image');
      const sessionId = cookies.get('sessionId');
      await verifyUserAndPostBsky(sessionId, text, blob);

      return { success: true, message: "Complete to post" };
    } catch (e) {
      console.error("[ERROR] An error occured: ", e);
      error(500, { message: e.error });
    } 
  },

  search: async ({ request }) => {
    try {
      const data = await request.formData();
      const handle = data.get('handle');

      const searchResult = await doSearchActors(handle);

      return { success: true, searchResult: searchResult };
    } catch (e) {
      console.error("[ERROR] An error occurred: ", e);
      throw error(500, { message: e.message });
    }
  },

  login: async ({ request, cookies }) => {
    try {
      const form = await request.formData();
      const handle = form.get('handle');
      const password = form.get('password');

      const sessionId = await createSession(handle, password);

      if (sessionId !== null) {
        cookies.set('sessionId', sessionId, {
          path: '/',
          httpOnly: true,
          secure: (NODE_ENV === 'development') ? false : true,
          maxAge: 31536000, // 1 year
        });
        return { status: 200, body: { success: true } };
      } else {
        return { status: 401, body: { success: false } };
      }
    } catch (e) {
      console.error("[ERROR] An error occurred: ", e);
      throw error(500, { message: e.message });
    }
  },

  logout: async ({ cookies, locals }) => {
    try {
      const sessionId = cookies.get('sessionId');
      const result = await verifyUser(sessionId);

      if (result.success) {
        // セッションID削除
        const result = await deleteSession(sessionId);
        if (result) {
          locals.isLoggedIn = false;
          return { status: 200, body: { success: true } };
        } else {
          return { status: 500, body: { success: false } }  
        }
      } else {
        return { status: 500, body: { success: false } };
      }
    } catch (e) {
      console.error("[ERROR] An error occurred: ", e);
      throw error(500, { message: e.message });
    }
  },
}

// hooks側の検証結果をここでセットし、クライアント側から読み出せるようにする
export async function load({locals}) {
  return {
    isLoggedIn: locals.isLoggedIn,
  }
}
