import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { logSupabase } from '../lib/logger';
import { api } from '../lib/api';
import { C } from '../lib/theme';
import BackBar from '../components/BackBar';

const T = {
  heading: 'משתמשים חסומים',
  empty: 'לא חסמתם אף אחד',
  emptyHint: 'משתמשים שתחסמו יופיעו כאן',
  unknownUser: 'משתמש',
  unblock: 'ביטול חסימה',
};

export default function BlockedUsers() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const data = await api.get('/api/blocks');
      setItems(data ?? []);
    } catch (err) {
      logSupabase('blocked.load', { message: err.message });
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function unblock(item) {
    setRemovingId(item.userId);
    try {
      await api.del('/api/blocks/' + item.userId);
      setItems((prev) => prev.filter((x) => x.userId !== item.userId));
    } catch (err) {
      logSupabase('blocked.unblock', { message: err.message }, { userId: item.userId });
    }
    setRemovingId(null);
  }

  return (
    <View style={s.wrap}>
      <BackBar title={T.heading} />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="ban-outline" size={44} color={C.textMuted} />
              <Text style={s.emptyTitle}>{T.empty}</Text>
              <Text style={s.emptyHint}>{T.emptyHint}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.fullName || T.unknownUser}</Text>
              </View>
              <Pressable
                style={[s.unblockBtn, removingId === item.userId && { opacity: 0.5 }]}
                onPress={() => unblock(item)}
                disabled={removingId === item.userId}
              >
                <Text style={s.unblockText}>{T.unblock}</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F4F6FA' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary },
  emptyHint: { fontSize: 13, color: C.textMuted },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: C.page, borderRadius: 16, padding: 14 },
  name: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right' },
  unblockBtn: { borderWidth: 1, borderColor: C.danger, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  unblockText: { color: C.danger, fontSize: 13, fontWeight: '600' },
});
