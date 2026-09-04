import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const APP_VERSION = Constants.expoConfig?.version ?? 'dev';
const IS_DEV = __DEV__;

const REDACT = /(\+?\d[\d\s-]{7,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)/g;

function clean(value) {
  if (value == null) return null;
  const text = typeof value === 'string' ? value : String(value);
  return text.replace(REDACT, '[redacted]').slice(0, 500);
}

async function write(level, scope, message, detail) {
  const line = '[' + scope + '] ' + message;
  if (level === 'error') console.log(line, detail ?? '');
  else if (IS_DEV) console.log(line, detail ?? '');

  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('app_logs').insert({
      user_id: user?.id ?? null,
      level,
      scope,
      message: clean(message),
      detail: detail ? JSON.parse(JSON.stringify(detail)) : null,
      platform: Platform.OS,
      app_version: APP_VERSION,
    });
  } catch {
    // never let logging break the app
  }
}

export const log = {
  error: (scope, message, detail) => write('error', scope, message, detail),
  warn: (scope, message, detail) => write('warn', scope, message, detail),
  info: (scope, message, detail) => write('info', scope, message, detail),
};

export function logSupabase(scope, error, context) {
  if (!error) return;
  log.error(scope, error.message, {
    code: error.code ?? null,
    hint: error.hint ?? null,
    ...context,
  });
}