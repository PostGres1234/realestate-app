import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_PREFIX = 'seen:';
const DRAFT_PREFIX = 'draft:';
const EPOCH = '1970-01-01T00:00:00.000Z';

export async function getSeen(conversationId) {
  try {
    const v = await AsyncStorage.getItem(SEEN_PREFIX + conversationId);
    return v || EPOCH;
  } catch {
    return EPOCH;
  }
}

export async function getSeenMap(conversationIds) {
  const map = {};
  try {
    const keys = conversationIds.map((id) => SEEN_PREFIX + id);
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([k, v]) => {
      map[k.replace(SEEN_PREFIX, '')] = v || EPOCH;
    });
  } catch {
    conversationIds.forEach((id) => { map[id] = EPOCH; });
  }
  return map;
}

export async function markSeen(conversationId) {
  try {
    await AsyncStorage.setItem(SEEN_PREFIX + conversationId, new Date().toISOString());
  } catch {}
}

export async function getDraft(conversationId) {
  try {
    const v = await AsyncStorage.getItem(DRAFT_PREFIX + conversationId);
    return v || '';
  } catch {
    return '';
  }
}

export async function saveDraft(conversationId, text) {
  try {
    if (text && text.trim()) {
      await AsyncStorage.setItem(DRAFT_PREFIX + conversationId, text);
    } else {
      await AsyncStorage.removeItem(DRAFT_PREFIX + conversationId);
    }
  } catch {}
}

export async function clearDraft(conversationId) {
  try {
    await AsyncStorage.removeItem(DRAFT_PREFIX + conversationId);
  } catch {}
}