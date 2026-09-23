import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Image, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { logSupabase } from '../lib/logger';
import { api } from '../lib/api';
import { C } from '../lib/theme';
import BackBar from '../components/BackBar';

const T = {
  heading: 'נצפו לאחרונה',
  empty: 'עדיין לא צפיתם בנכסים',
  emptyHint: 'נכסים שתפתחו יופיעו כאן',
  guest: 'התחברו כדי לראות היסטוריה',
  login: 'התחברות',
  rooms: 'חד׳',
  sqm: 'מ"ר',
  perMonth: 'לחודש',
  clear: 'ניקוי הכל',
  clearTitle: 'ניקוי היסטוריה',
  clearBody: 'למחוק את כל הנכסים שנצפו לאחרונה?',
  cancel: 'ביטול',
  clearConfirm: 'מחק',
};

export default function Recent() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data: views, error } = await supabase
      .from('recently_viewed')
      .select('property_id, viewed_at')
      .order('viewed_at', { ascending: false })
      .limit(20);

    if (error) logSupabase('recent.load', error);

    const ids = (views ?? []).map((v) => v.property_id);
    if (!ids.length) { setItems([]); setLoading(false); return; }

    const { data } = await supabase
      .from('properties')
      .select('id, title, price, city, neighborhood, bedrooms, area_sqm, listing_type')
      .in('id', ids)
      .eq('status', 'active');

    const byId = {};
    (data ?? []).forEach((p) => { byId[p.id] = p; });

    const { data: imgs } = await supabase
      .from('property_images')
      .select('property_id, url, position, media_type')
      .in('property_id', ids)
      .eq('media_type', 'image')
      .order('position', { ascending: true });

    (imgs ?? []).forEach((im) => {
      if (byId[im.property_id] && !byId[im.property_id].cover) {
        byId[im.property_id].cover = im.url;
      }
    });

    setItems(ids.map((id) => byId[id]).filter(Boolean));
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function clearAll() {
    Alert.alert(T.clearTitle, T.clearBody, [
      { text: T.cancel, style: 'cancel' },
      {
        text: T.clearConfirm,
        style: 'destructive',
        onPress: async () => {
          setItems([]);
          try {
            await api.del('/api/recent');
          } catch (err) {
            logSupabase('recent.clear', { message: err.message });
          }
        },
      },
    ]);
  }

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  if (!user) {
    return (
      <View style={s.wrap}>
        <BackBar title={T.heading} />
        <View style={s.center}>
          <Ionicons name="time-outline" size={54} color={C.textMuted} />
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
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text style={s.clearText}>{T.clear}</Text>
            </Pressable>
          ) : null
        }
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="time-outline" size={50} color={C.textMuted} />
              <Text style={s.emptyTitle}>{T.empty}</Text>
              <Text style={s.emptyHint}>{T.emptyHint}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => router.push('/property/' + item.id)}>
              {item.cover ? (
                <Image source={{ uri: item.cover }} style={s.thumb} />
              ) : (
                <View style={[s.thumb, s.thumbEmpty]}>
                  <Ionicons name="image-outline" size={22} color={C.placeholderIcon} />
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={s.price}>
                  {money(item.price)}
                  {item.listing_type === 'rent' ? ' ' + T.perMonth : ''}
                </Text>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>

                <View style={s.locRow}>
                  <Ionicons name="location-outline" size={12} color={C.textMuted} />
                  <Text style={s.loc} numberOfLines={1}>
                    {item.neighborhood ? item.city + ', ' + item.neighborhood : item.city}
                  </Text>
                </View>

                <Text style={s.meta}>
                  {(item.bedrooms ?? '-') + ' ' + T.rooms + '  ·  ' + (item.area_sqm ?? '-') + ' ' + T.sqm}
                </Text>
              </View>

              <Ionicons name="chevron-back" size={18} color={C.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F4F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 24 },
  clearText: { color: C.danger, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: C.page, borderRadius: 16, padding: 11, shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  thumb: { width: 82, height: 82, borderRadius: 12, backgroundColor: C.placeholder },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  price: { fontSize: 17, fontWeight: '800', color: C.primary, textAlign: 'right' },
  title: { fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'right', marginTop: 2 },
  locRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3, marginTop: 3 },
  loc: { fontSize: 12, color: C.textMuted, flex: 1, textAlign: 'right' },
  meta: { fontSize: 11, color: C.textSecondary, textAlign: 'right', marginTop: 3 },
  emptyBox: { alignItems: 'center', marginTop: 70, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: C.textMuted },
  btn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});