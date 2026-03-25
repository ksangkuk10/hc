import { TOKEN_KEY } from '../config.js';

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(t) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* */
  }
}

export async function api(path, options) {
  const opts = options || {};
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  const tok = getToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;
  const res = await fetch(path, { ...opts, headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { error: text || '오류' };
  }
  if (!res.ok) {
    const err = new Error((json && json.error) || res.statusText || '요청 실패');
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}
