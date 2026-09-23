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

// Reads a server-sent-events response, calling onDelta for each incremental
// text chunk and returning the final `{done: true, ...}` payload once the
// stream ends. Relies on Expo SDK 57's global fetch (WinterCG-compliant,
// streams response bodies on both platforms) rather than any polyfill.
async function requestStream(path, body, onDelta) {
  const { data: sess } = await supabase.auth.getSession();

  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + (sess?.session?.access_token ?? ''),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error || 'Request failed (' + res.status + ')');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = rawEvent.replace(/^data:\s*/, '');
      if (!line) continue;

      let evt;
      try {
        evt = JSON.parse(line);
      } catch {
        continue;
      }

      if (evt.done) final = evt;
      else if (evt.delta) onDelta(evt.delta);
    }
  }

  return final ?? { text: '', ids: [], options: [], skippable: false, multi: false };
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  postStream: (path, body, onDelta) => requestStream(path, body, onDelta),
};
