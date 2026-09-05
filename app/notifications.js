import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { getSeenMap, markSeen } from '../lib/inbox';
import { logSupabase } from '../lib/logger';
import { C } from '../lib/theme';
import BackBar from '../components/BackBar';

const T = {
  heading: 'התראות',
  empty: 'אין התראות חדשות',
  emptyHint: 'הודעות חדשות ונכסים שמתאימים להעדפות שלכם יופיעו כאן',
  guest: 'התחברו כדי לראות התראות',
  login: 'התחברות',
  msgTitle: 'הודעה חדשה',
  msgTitleMany: 'הודעות חדשות',
  matchTitle: 'נכס חדש מתאים לכם',
  markAll: 'סימון הכל כנקרא',
  now: 'עכשיו',
  minutes: 'דק׳',
  hours: 'שעות',
  days: 'ימים',
};

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const out = [];

    const { data: convos } = await supabase
      .from('conversations')
      .select('id, property_id, buyer_id, seller_id');

    const convIds = (convos ?? []).map((c) => c.id);

    if (convIds.length) {
      const seenMap = await getSeenMap(convIds);

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at')
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false });

      const unseen = (msgs ?? []).filter(
        (m) => new Date(m.created_at) > new Date(seenMap[m.conversation_id] ?? 0)
      );

      const byConv = {};
      unseen.forEach((m) => {
        if (!byConv[m.conversation_id]) byConv[m.conversation_id] = [];
        byConv[m.conversation_id].push(m);
      });

      const propIds = [...new Set((convos ?? []).map((c) => c.property_id))];
      let titles = {};
      if (propIds.length) {
        const { data: props } = await supabase
          .from('properties').select('id, title, city').in('id', propIds);
        (props ?? []).forEach((p) => { titles[p.id] = p; });
      }

      Object.keys(byConv).forEach((cid) => {
        const list = byConv[cid];
        const conv = (convos ?? []).find((c) => c.id === cid);
        const prop = titles[conv?.property_id];
        out.push({
          key: 'msg-' + cid,
          kind: 'message',
          title: list.length === 1 ? T.msgTitle : list.length + ' ' + T.msgTitleMany,
          subtitle: prop?.title ?? prop?.city ?? '',
          preview: list[0].body.split('\n')[0],
          at: list[0].created_at,
          path: '/chat/' + cid,
        });
      });
    }

    const { data: matches, error } = await supabase.rpc('my_new_matches');
    if (error) logSupabase('notifications.matches', error);

    (matches ?? []).forEach((p) => {
      out.push({
        key: 'match-' + p.id,
        kind: 'match',
        title: T.matchTitle,
        subtitle: p.title ?? p.city,
        preview: p.neighborhood ? p.city + ', ' + p.neighborhood : p.city,
        price: p.price,
        at: p.created_at,
        path: '/property/' + p.id,
      });
    });

    out.sort((a, b) => new Date(b.at) - new Date(a.at));
    setItems(out);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markAll() {
    const { data: convos } = await supabase.from('conversations').select('id');
    for (const c of convos ?? []) {
      await markSeen(c.id);
    }
    await supabase
      .from('preferences')
      .update({ last_checked: new Date().toISOString() })
      .eq('user_id', user.id);
    load();
  }

  const ago = (iso) => {
    const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (mins < 1) return T.now;
    if (mins < 60) return mins + ' ' + T.minutes;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' ' + T.hours;
    return Math.floor(hrs / 24) + ' ' + T.days;
  };

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  if (!user) {
    return (
      <View style={s.wrap}>
        <BackBar title={T.heading} />
        <View style={s.center}>
          <Ionicons name="notifications-off-outline" size={54} color={C.textMuted} />
          <Text style={s.emptyTitle}>{T.guest}</Text>
          <Pressable style={s.btn} onPress={() => router.push('/subscribe')}>
            <Text style={s.btnText}>{T.login}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <BackBar
        title={T.heading}
        right={
          items.length ? (
            <View style={s.countPill}>
              <Text style={s.countText}>{items.length}</Text>
            </View>
          ) : null
        }
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.key}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={C.primary}
              onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="checkmark-done-outline" size={50} color={C.textMuted} />
              <Text style={s.emptyTitle}>{T.empty}</Text>
              <Text style={s.emptyHint}>{T.emptyHint}</Text>
            </View>
          }
          ListFooterComponent={
            items.length ? (
              <Pressable style={s.markBtn} onPress={markAll}>
                <Ionicons name="checkmark-done" size={17} color={C.primary} />
                <Text style={s.markText}>{T.markAll}</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => router.push(item.path)}>
              <View style={[s.icon, item.kind === 'match' && s.iconMatch]}>
                <Ionicons
                  name={item.kind === 'message' ? 'chatbubble' : 'home'}
                  size={17}
                  color={item.kind === 'message' ? C.primary : '#0F6E56'}
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.time}>{ago(item.at)}</Text>
                </View>
                {item.subtitle ? (
                  <Text style={s.subtitle} numberOfLines={1}>{item.subtitle}</Text>
                ) : null}
                <Text style={s.preview} numberOfLines={1}>{item.preview}</Text>
                {item.price ? (
                  <Text style={s.price}>{money(item.price)}</Text>
                ) : null}
              </View>

              <View style={s.dot} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F4F6FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  countPill: { backgroundColor: C.danger, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, backgroundColor: C.page, borderRadius: 16, padding: 14, shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  iconMatch: { backgroundColor: '#E1F5EE' },
  titleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  title: { fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'right', flex: 1 },
  time: { fontSize: 11, color: C.textMuted },
  subtitle: { fontSize: 13, color: C.textSecondary, textAlign: 'right', marginTop: 2 },
  preview: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 3 },
  price: { fontSize: 14, fontWeight: '800', color: C.primary, textAlign: 'right', marginTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginTop: 6 },
  markBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 18 },
  markText: { color: C.primary, fontWeight: '600', fontSize: 14 },
  emptyBox: { alignItems: 'center', marginTop: 70, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 30 },
  btn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});