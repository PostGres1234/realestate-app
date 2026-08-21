import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { getSeenMap } from '../lib/inbox';
import { C } from '../lib/theme';
import TabBar from '../components/TabBar';

const T = {
  heading: 'הודעות',
  back: 'חזרה לנכסים',
  empty: 'אין לכם שיחות עדיין.',
  guest: 'התחברו כדי לראות את ההודעות שלכם.',
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
      console.log('inbox error', error.message);
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
      <View style={s.center}>
        <Text style={s.muted}>{T.guest}</Text>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={s.link}>{T.back}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.h1}>{T.heading}</Text>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={s.link}>{T.back}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListEmptyComponent={<Text style={s.muted}>{T.empty}</Text>}
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
      <TabBar active="messages" />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 60, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  h1: { fontSize: 28, fontWeight: '700', textAlign: 'right' },
  link: { color: '#1f6feb', fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 16, backgroundColor: '#fafafa' },
  topRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', textAlign: 'right', flex: 1 },
  badge: { backgroundColor: '#e5484d', minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  meta: { color: '#666', fontSize: 14, marginTop: 2, textAlign: 'right' },
  price: { color: '#1f6feb', fontWeight: '700', marginTop: 4, textAlign: 'right' },
  preview: { color: '#444', fontSize: 14, marginTop: 8, textAlign: 'right' },
  bottomRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8 },
  role: { color: '#999', fontSize: 12 },
  time: { color: '#999', fontSize: 12 },
  muted: { color: '#666', textAlign: 'center', marginTop: 40 },
});