import { supabase } from './supabase';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

async function request(path, { method = 'GET', body } = {}) {
  const { data: sess } = await supabase.auth.getSession();

  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + (sess?.session?.access_token ?? ''),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || 'Request failed (' + res.status + ')');
  }
  return json;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
};
