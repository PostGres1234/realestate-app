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
  heading: 'נכסים בשבילכם',
  sub: 'לפי ההעדפות שהגדרתם',
  empty: 'אין נכסים חדשים כרגע',
  emptyHint: 'נעדכן אתכם כשיתפרסם נכס שמתאים להעדפות שלכם',
  editPrefs: 'עריכת העדפות',
  rooms: 'חד׳',
  sqm: 'מ"ר',
  perMonth: 'לחודש',
  results: 'נכסים',
};

const TYPES = {
  apartment: 'דירה',
  house: 'בית פרטי',
  penthouse: 'פנטהאוז',
};

export default function Matches() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase.rpc('my_new_matches');
    if (error) logSupabase('matches.load', error);

    const list = data ?? [];
    if (list.length) {
      const { data: imgs, error: imgErr } = await supabase
        .from('property_images')
        .select('property_id, url, position, media_type')
        .in('property_id', list.map((x) => x.id))
        .eq('media_type', 'image')
        .order('position', { ascending: true });

      if (imgErr) logSupabase('matches.covers', imgErr);

      const covers = {};
      (imgs ?? []).forEach((im) => {
        if (!covers[im.property_id]) covers[im.property_id] = im.url;
      });
      list.forEach((x) => { x.cover = covers[x.id] ?? null; });
    }

    setItems(list);

    const { error: prefErr } = await supabase
      .from('preferences')
      .update({ last_checked: new Date().toISOString() })
      .eq('user_id', user.id);
    if (prefErr) logSupabase('matches.markRead', prefErr);

    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  return (
    <View style={s.wrap}>
      <BackBar
        title={T.heading}
        subtitle={T.sub}
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
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="sparkles-outline" size={50} color={C.textMuted} />
              <Text style={s.emptyTitle}>{T.empty}</Text>
              <Text style={s.emptyHint}>{T.emptyHint}</Text>
              <Pressable style={s.btnOutline} onPress={() => router.push('/preferences')}>
                <Text style={s.btnOutlineText}>{T.editPrefs}</Text>
              </Pressable>
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

                {item.property_type ? (
                  <View style={s.typeTag}>
                    <Text style={s.typeTagText}>{TYPES[item.property_type]}</Text>
                  </View>
                ) : null}
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
  countPill: { backgroundColor: C.primaryTint, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  card: { borderRadius: 18, backgroundColor: C.page, overflow: 'hidden', shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: 180, backgroundColor: C.placeholder },
  imgEmpty: { alignItems: 'center', justifyContent: 'center' },
  priceBadge: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 7, shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  priceBadgeText: { fontSize: 17, fontWeight: '800', color: C.primary },
  priceBadgeSub: { fontSize: 11, color: C.textMuted },
  typeTag: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeTagText: { fontSize: 11, color: C.primary, fontWeight: '700' },
  body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right' },
  locRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 5 },
  loc: { fontSize: 13, color: C.textMuted, flex: 1, textAlign: 'right' },
  specs: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  spec: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  specText: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  divider: { width: 1, height: 14, backgroundColor: '#E6EAF2' },
  emptyBox: { alignItems: 'center', marginTop: 70, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary },
  emptyHint: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 30 },
  btnOutline: { borderWidth: 1, borderColor: C.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13, marginTop: 6 },
  btnOutlineText: { color: C.primary, fontWeight: '600', fontSize: 15 },
});