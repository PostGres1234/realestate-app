import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';

const T = {
  heading: 'נכסים חדשים בשבילכם',
  sub: 'לפי ההעדפות שהגדרתם',
  back: 'חזרה',
  empty: 'אין נכסים חדשים כרגע.',
  editPrefs: 'עריכת העדפות',
  markRead: 'סימון הכל כנקרא',
  rooms: 'חדרים',
  sqm: 'מ"ר',
  perMonth: 'לחודש',
};

export default function Matches() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase.rpc('my_new_matches');
    if (error) console.log('matches error', error.message);

    const list = data ?? [];
    if (list.length) {
      const { data: imgs } = await supabase
        .from('property_images')
        .select('property_id, url, position, media_type')
        .in('property_id', list.map((x) => x.id))
        .eq('media_type', 'image')
        .order('position', { ascending: true });
      const covers = {};
      (imgs ?? []).forEach((im) => {
        if (!covers[im.property_id]) covers[im.property_id] = im.url;
      });
      list.forEach((x) => { x.cover = covers[x.id] ?? null; });
    }

    setItems(list);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markRead() {
    await supabase
      .from('preferences')
      .update({ last_checked: new Date().toISOString() })
      .eq('user_id', user.id);
    router.replace('/');
  }

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <View>
          <Text style={s.h1}>{T.heading}</Text>
          <Text style={s.sub}>{T.sub}</Text>
        </View>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={s.link}>{T.back}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 14 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50, gap: 16 }}>
              <Ionicons name="notifications-off-outline" size={50} color={C.textMuted} />
              <Text style={s.muted}>{T.empty}</Text>
              <Pressable style={s.btnOutline} onPress={() => router.push('/preferences')}>
                <Text style={s.btnOutlineText}>{T.editPrefs}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => router.push('/property/' + item.id)}>
              {item.cover ? (
                <Image source={{ uri: item.cover }} style={s.img} />
              ) : (
                <View style={[s.img, s.imgEmpty]}>
                  <Ionicons name="image-outline" size={26} color={C.placeholderIcon} />
                </View>
              )}
              <View style={s.body}>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                <View style={s.locRow}>
                  <Ionicons name="location-outline" size={13} color={C.textMuted} />
                  <Text style={s.loc}>
                    {item.city}{item.neighborhood ? ', ' + item.neighborhood : ''}
                  </Text>
                </View>
                <Text style={s.meta}>
                  {(item.bedrooms ?? '-') + ' ' + T.rooms + '  ·  ' + (item.area_sqm ?? '-') + ' ' + T.sqm}
                </Text>
                <View style={s.priceRow}>
                  <Text style={s.price}>{money(item.price)}</Text>
                  {item.listing_type === 'rent' ? (
                    <Text style={s.perMonth}>{T.perMonth}</Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      {items.length ? (
        <Pressable style={s.markBtn} onPress={markRead}>
          <Text style={s.markText}>{T.markRead}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page, paddingTop: 56 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16 },
  h1: { fontSize: 24, fontWeight: '700', color: C.text, textAlign: 'right' },
  sub: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 3 },
  link: { color: C.primary, fontWeight: '600', fontSize: 15, marginTop: 6 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  img: { width: '100%', height: 150, backgroundColor: C.placeholder },
  imgEmpty: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 14 },
  title: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right' },
  locRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 5 },
  loc: { fontSize: 12, color: C.textMuted },
  meta: { fontSize: 12, color: C.textSecondary, textAlign: 'right', marginTop: 5 },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 5, marginTop: 8 },
  price: { fontSize: 18, fontWeight: '700', color: C.primary },
  perMonth: { fontSize: 12, color: C.textMuted },
  markBtn: { borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 16, paddingBottom: 30, alignItems: 'center' },
  markText: { color: C.primary, fontWeight: '600', fontSize: 15 },
  btnOutline: { borderWidth: 1, borderColor: C.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 },
  btnOutlineText: { color: C.primary, fontWeight: '600', fontSize: 15 },
  muted: { color: C.textMuted, textAlign: 'center', fontSize: 15 },
});