import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { logSupabase } from '../lib/logger';
import { C } from '../lib/theme';

const T = {
  heading: 'נצפו לאחרונה',
  back: 'חזרה',
  empty: 'עדיין לא צפיתם בנכסים',
  emptyHint: 'נכסים שתפתחו יופיעו כאן',
  rooms: 'חד׳',
  sqm: 'מ"ר',
  perMonth: 'לחודש',
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

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.h1}>{T.heading}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={s.link}>{T.back}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
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
                  <Ionicons name="image-outline" size={20} color={C.placeholderIcon} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.price}>
                  {money(item.price)}
                  {item.listing_type === 'rent' ? ' ' + T.perMonth : ''}
                </Text>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                <Text style={s.meta} numberOfLines={1}>
                  {item.neighborhood ? item.city + ', ' + item.neighborhood : item.city}
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
  wrap: { flex: 1, backgroundColor: C.page, paddingTop: 56 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  h1: { fontSize: 24, fontWeight: '700', color: C.text },
  link: { color: C.primary, fontWeight: '600', fontSize: 15 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 10 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: C.placeholder },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  price: { fontSize: 16, fontWeight: '800', color: C.primary, textAlign: 'right' },
  title: { fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'right', marginTop: 2 },
  meta: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 2 },
  emptyBox: { alignItems: 'center', marginTop: 70, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary },
  emptyHint: { fontSize: 13, color: C.textMuted },
});