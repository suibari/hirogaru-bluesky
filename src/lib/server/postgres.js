import { DB_API_URL, CF_CLIENT_ID, CF_CLIENT_SECRET } from '$env/static/private';

/**
 * PostgRESTへの共通リクエスト関数
 */
async function dbFetch(path, options = {}) {
  const url = `${DB_API_URL}${path}`;

  const headers = new Headers(options.headers);
  headers.set('CF-Access-Client-Id', CF_CLIENT_ID);
  headers.set('CF-Access-Client-Secret', CF_CLIENT_SECRET);
  headers.set('Content-Type', 'application/json');

  // Content-Profileヘッダーの設定: 必要
  const profile = headers.get('Accept-Profile');
  if (profile && !headers.has('Content-Profile')) {
    headers.set('Content-Profile', profile);
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    throw new Error(`DB API Error: ${response.statusText} (${response.status})`);
  }

  // 204 No Content（Update/Deleteなど）の場合はnullを返す
  if (response.status === 204 || response.status === 201) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * ひろがるBluesky用の具体的なヘルパー関数群
 */
export const db = {
  // 特定のユーザーの要素（elements）を取得
  getElements: async (handle) => {
    // schemaを跨ぐ場合はヘッダーで指定（デフォルトがhirogaruなら不要）
    return await dbFetch(`/elements?handle=eq.${handle}`, {
      headers: { 'Accept-Profile': 'hirogaru' }
    });
  },

  // 要素の保存（upsert）
  upsertElement: async (handle, elements) => {
    return await dbFetch('/elements', {
      method: 'POST',
      body: JSON.stringify({
        handle,
        elements,
        updated_at: new Date()
      }),
      headers: {
        'Prefer': 'resolution=merge-duplicates', // 重複時は更新
        'Accept-Profile': 'hirogaru'
      }
    });
  },

  // 統計情報の更新
  updateStatistics: async (id, data) => {
    return await dbFetch(`/statistics?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: { 'Prefer': 'return=representation', 'Accept-Profile': 'hirogaru' }
    });
  },

  // セッションの取得
  getSession: async (sessionId) => {
    return await dbFetch(`/sessions?session_id=eq.${sessionId}`, {
      headers: { 'Accept-Profile': 'hirogaru' }
    });
  },

  // セッションの作成
  createSession: async (data) => {
    return await dbFetch('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Accept-Profile': 'hirogaru'
      }
    });
  },

  // セッションの削除
  deleteSession: async (sessionId) => {
    // PostgRESTでDELETEは204を返すことが多いのでnullが返る想定
    return await dbFetch(`/sessions?session_id=eq.${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Prefer': 'return=representation', // 削除されたデータを返してほしい場合
        'Accept-Profile': 'hirogaru'
      }
    });
  },

  // トークンの取得
  getToken: async (handle) => {
    return await dbFetch(`/tokens?handle=eq.${handle}`, {
      headers: { 'Accept-Profile': 'hirogaru' }
    });
  },

  // トークンの保存（upsert）
  upsertToken: async (handle, tokenData) => {
    return await dbFetch('/tokens', {
      method: 'POST',
      body: JSON.stringify({ handle, ...tokenData }),
      headers: {
        'Prefer': 'resolution=merge-duplicates', // 重複時は更新
        'Accept-Profile': 'hirogaru'
      }
    });
  }
};
