import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { logSupabase } from '../lib/logger';
import { C } from '../lib/theme';
import BackBar from '../components/BackBar';

const T = {
  heading: 'נכסים שמורים',
  empty: 'לא שמרתם נכסים עדיין',
  emptyHint: 'לחצו על הלב בכל נכס כדי לשמור אותו',
  guest: 'התחברו כדי לשמור נכסים',
  login: 'התחברות',
  rooms: 'חד׳',
  sqm: 'מ"ר',
  perMonth: 'לחודש',
  results: 'נכסים',
};

export default function Saved() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data: favs, error } = await supabase
      .from('favorites')
      .select('property_id, created_at')
      .order('created_at', { ascending: false });

    if (error) logSupabase('saved.load', error);

    const ids = (favs ?? []).map((f) => f.property_id);
    if (!ids.length) { setItems([]); setLoading(false); return; }

    const { data } = await supabase
      .from('properties')
      .select('id, title, price, city, neighborhood, bedrooms, bathrooms, area_sqm, listing_type')
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

  async function remove(id) {
    setItems((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from('favorites').delete()
      .eq('user_id', user.id).eq('property_id', id);
    if (error) logSupabase('saved.remove', error);
  }

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  if (!user) {
    return (
      <View style={s.wrap}>
        <BackBar title={T.heading} />
        <View style={s.center}>
          <Ionicons name="heart-outline" size={54} color={C.textMuted} />
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
            <Text style={s.count}>{items.length + ' ' + T.results}</Text>
          ) : null
        }
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="heart-outline" size={50} color={C.textMuted} />
              <Text style={s.emptyTitle}>{T.empty}</Text>
              <Text style={s.emptyHint}>{T.emptyHint}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => router.push('/property/' + item.id)}>
              <View style={s.imgWrap}>
                {item.cover ? (
                  <Image source={{ uri: item.cover }} style={s.img} />
                ) : (
                  <View style={[s.img, s.imgEmpty]}>
                    <Ionicons name="image-outline" size={30} color={C.placeholderIcon} />
                  </View>
                )}

                <View style={s.priceBadge}>
                  <Text style={s.priceBadgeText}>{money(item.price)}</Text>
                  {item.listing_type === 'rent' ? (
                    <Text style={s.priceBadgeSub}>{T.perMonth}</Text>
                  ) : null}
                </View>

                <Pressable style={s.heart} onPress={() => remove(item.id)}>
                  <Ionicons name="heart" size={18} color={C.danger} />
                </Pressable>
              </View>

              <View style={s.body}>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>

                <View style={s.locRow}>
                  <Ionicons name="location-outline" size={14} color={C.textMuted} />
                  <Text style={s.loc} numberOfLines={1}>
                    {item.neighborhood ? item.city + ', ' + item.neighborhood : item.city}
                  </Text>
                </View>

                <View style={s.specs}>
                  <View style={s.spec}>
                    <Ionicons name="bed-outline" size={16} color={C.primary} />
                    <Text style={s.specText}>{(item.bedrooms ?? '-') + ' ' + T.rooms}</Text>
                  </View>
                  <View style={s.divider} />
                  <View style={s.spec}>
                    <Ionicons name="water-outline" size={16} color={C.primary} />
                    <Text style={s.specText}>{item.bathrooms ?? '-'}</Text>
                  </View>
                  <View style={s.divider} />
                  <View style={s.spec}>
                    <Ionicons name="resize-outline" size={16} color={C.primary} />
                    <Text style={s.specText}>{(item.area_sqm ?? '-') + ' ' + T.sqm}</Text>
                  </View>
                </View>
              </View>
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
  count: { fontSize: 12, color: C.textMuted },
  card: { borderRadius: 18, backgroundColor: C.page, overflow: 'hidden', shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: 180, backgroundColor: C.placeholder },
  imgEmpty: { alignItems: 'center', justifyContent: 'center' },
  priceBadge: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 7, shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  priceBadgeText: { fontSize: 17, fontWeight: '800', color: C.primary },
  priceBadgeSub: { fontSize: 11, color: C.textMuted },
  heart: { position: 'absolute', top: 12, left: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right' },
  locRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 5 },
  loc: { fontSize: 13, color: C.textMuted, flex: 1, textAlign: 'right' },
  specs: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  spec: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  specText: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  divider: { width: 1, height: 14, backgroundColor: '#E6EAF2' },
  emptyBox: { alignItems: 'center', marginTop: 70, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  btn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});