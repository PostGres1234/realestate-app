import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { getSeenMap } from '../lib/inbox';
import { logSupabase } from '../lib/logger';
import { C } from '../lib/theme';
import BackBar from '../components/BackBar';
import TabBar from '../components/TabBar';

const T = {
  heading: 'הודעות',
  empty: 'אין לכם שיחות עדיין',
  emptyHint: 'שיחות עם בעלי נכסים יופיעו כאן',
  guest: 'התחברו כדי לראות את ההודעות שלכם',
  login: 'התחברות',
  asSeller: 'כמוכר',
  asBuyer: 'כקונה',
};

export default function Messages() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data: convos, error } = await supabase
      .from('conversations')
      .select('id, property_id, buyer_id, seller_id, created_at');

    if (error) {
      logSupabase('inbox.load', error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const list = convos ?? [];
    if (!list.length) {
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const convoIds = list.map((c) => c.id);
    const propIds = [...new Set(list.map((c) => c.property_id))];

    const [{ data: msgs }, seenMap] = await Promise.all([
      supabase
        .from('messages')
        .select('conversation_id, sender_id, body, created_at')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: true }),
      getSeenMap(convoIds),
    ]);

    let props = {};
    if (propIds.length) {
      const { data: p } = await supabase
        .from('properties')
        .select('id, title, city, price')
        .in('id', propIds);
      (p ?? []).forEach((x) => { props[x.id] = x; });
    }

    const stats = {};
    (msgs ?? []).forEach((m) => {
      if (!stats[m.conversation_id]) {
        stats[m.conversation_id] = { count: 0, last: null, lastAt: null };
      }
      const st = stats[m.conversation_id];
      const seenAt = seenMap[m.conversation_id];
      if (m.sender_id !== user.id && new Date(m.created_at) > new Date(seenAt)) {
        st.count += 1;
      }
      st.last = m.body;
      st.lastAt = m.created_at;
    });

    const enriched = list.map((c) => {
      const st = stats[c.id] ?? { count: 0, last: null, lastAt: null };
      return {
        ...c,
        property: props[c.property_id] ?? null,
        role: c.seller_id === user.id ? T.asSeller : T.asBuyer,
        incoming: st.count,
        preview: st.last,
        sortKey: st.lastAt ?? c.created_at,
      };
    });

    const withMessages = enriched.filter((c) => c.preview !== null);
    withMessages.sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey));

    setRows(withMessages);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  const when = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay
      ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  };

  if (!user) {
    return (
      <View style={s.wrap}>
        <BackBar title={T.heading} />
        <View style={s.center}>
          <Ionicons name="chatbubbles-outline" size={54} color={C.textMuted} />
          <Text style={s.emptyTitle}>{T.guest}</Text>
          <Pressable style={s.btn} onPress={() => router.push('/subscribe')}>
            <Text style={s.btnText}>{T.login}</Text>
          </Pressable>
        </View>
        <TabBar active="messages" />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <BackBar title={T.heading} />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={C.primary}
              onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={50} color={C.textMuted} />
              <Text style={s.emptyTitle}>{T.empty}</Text>
              <Text style={s.emptyHint}>{T.emptyHint}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => router.push('/chat/' + item.id)}>
              <View style={s.topRow}>
                <Text style={s.title} numberOfLines={1}>
                  {item.property?.title ?? '---'}
                </Text>
                {item.incoming > 0 ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{item.incoming}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={s.meta}>{item.property?.city ?? ''}</Text>
              {item.property ? (
                <Text style={s.price}>{money(item.property.price)}</Text>
              ) : null}

              <Text style={s.preview} numberOfLines={1}>{item.preview}</Text>

              <View style={s.bottomRow}>
                <Text style={s.role}>{item.role}</Text>
                <Text style={s.time}>{when(item.sortKey)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <TabBar active="messages" unread={0} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F4F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 24 },
  card: { borderRadius: 16, backgroundColor: C.page, padding: 16, shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  topRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right', flex: 1 },
  badge: { backgroundColor: C.danger, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  meta: { color: C.textMuted, fontSize: 13, marginTop: 3, textAlign: 'right' },
  price: { color: C.primary, fontWeight: '800', fontSize: 16, marginTop: 5, textAlign: 'right' },
  preview: { color: C.textSecondary, fontSize: 14, marginTop: 9, textAlign: 'right' },
  bottomRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 10 },
  role: { color: C.textMuted, fontSize: 12 },
  time: { color: C.textMuted, fontSize: 12 },
  emptyBox: { alignItems: 'center', marginTop: 70, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: C.textMuted },
  btn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});