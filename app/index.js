import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { getSeenMap } from '../lib/inbox';
import { C } from '../lib/theme';
import TabBar from '../components/TabBar';
import MultiCityInput from '../components/MultiCityInput';
import FilterSheet, { FEATURES } from '../components/FilterSheet';
import MatchesBanner from '../components/MatchesBanner';

const T = {
  locationLabel: 'מיקום',
  allCountry: 'כל הארץ',
  searchPlaceholder: 'הוסיפו ערים או שכונות',
  sale: 'למכירה',
  rent: 'להשכרה',
  sectionAll: 'כל הנכסים',
  guestNotice: 'גולשים לא רשומים רואים רק עיר ומחיר',
  empty: 'לא נמצאו נכסים מתאימים',
  rooms: 'חדרים',
  sqm: 'מ"ר',
  perMonth: 'לחודש',
};

const TYPES = {
  apartment: 'דירה',
  house: 'בית פרטי',
  penthouse: 'פנטהאוז',
};

const EMPTY = {
  minPrice: '', maxPrice: '',
  minRooms: '', maxRooms: '',
  minBaths: '', maxBaths: '',
  has_balcony: false, has_shelter: false,
  has_parking: false, has_elevator: false, has_yard: false,
};

export default function Browse() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [favs, setFavs] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [cities, setCities] = useState([]);
  const [mode, setMode] = useState('sale');
  const [sheet, setSheet] = useState(false);
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);

  const activeCount = Object.entries(applied).filter(([k, v]) =>
    typeof v === 'boolean' ? v : String(v).length > 0
  ).length;

  const load = useCallback(async () => {
    const cols = user
      ? 'id, title, price, city, neighborhood, address, bedrooms, bathrooms, area_sqm, property_type, listing_type'
      : 'id, price, city, listing_type';

    let query = supabase
      .from('properties')
      .select(cols)
      .eq('status', 'active')
      .eq('listing_type', mode)
      .order('created_at', { ascending: false })
      .limit(50);

    if (cities.length) {
      query = user
        ? query.or(
            cities.map((c) => 'city.eq.' + c).join(',') + ',' +
            cities.map((c) => 'neighborhood.eq.' + c).join(',')
          )
        : query.in('city', cities);
    }

    if (applied.minPrice) query = query.gte('price', Number(applied.minPrice));
    if (applied.maxPrice) query = query.lte('price', Number(applied.maxPrice));

    if (user) {
      if (applied.minRooms) query = query.gte('bedrooms', Number(applied.minRooms));
      if (applied.maxRooms) query = query.lte('bedrooms', Number(applied.maxRooms));
      if (applied.minBaths) query = query.gte('bathrooms', Number(applied.minBaths));
      if (applied.maxBaths) query = query.lte('bathrooms', Number(applied.maxBaths));
      FEATURES.forEach((x) => {
        if (applied[x.key]) query = query.eq(x.key, true);
      });
    }

    const { data, error } = await query;
    if (error) console.log('load error', error.message);

    const list = data ?? [];
    if (list.length) {
      const ids = list.map((x) => x.id);
      const { data: imgs } = await supabase
        .from('property_images')
        .select('property_id, url, position, media_type')
        .in('property_id', ids)
        .eq('media_type', 'image')
        .order('position', { ascending: true });

      const covers = {};
      (imgs ?? []).forEach((im) => {
        if (!covers[im.property_id]) covers[im.property_id] = im.url;
      });
      list.forEach((x) => { x.cover = covers[x.id] ?? null; });

      if (user) {
        const { data: f } = await supabase
          .from('favorites').select('property_id').in('property_id', ids);
        const map = {};
        (f ?? []).forEach((row) => { map[row.property_id] = true; });
        setFavs(map);
      } else {
        setFavs({});
      }
    }

    setItems(list);
    setLoading(false);
    setRefreshing(false);
  }, [cities, applied, mode, user]);

  const loadUnread = useCallback(async () => {
    if (!user) { setUnread(0); return; }
    const { data: convos } = await supabase.from('conversations').select('id');
    const ids = (convos ?? []).map((c) => c.id);
    if (!ids.length) { setUnread(0); return; }

    const seenMap = await getSeenMap(ids);
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, created_at')
      .in('conversation_id', ids)
      .neq('sender_id', user.id);

    setUnread((msgs ?? []).filter(
      (m) => new Date(m.created_at) > new Date(seenMap[m.conversation_id] ?? 0)
    ).length);
  }, [user]);

  useFocusEffect(
    useCallback(() => { load(); loadUnread(); }, [load, loadUnread])
  );

  async function toggleFav(id) {
    if (!user) return router.push('/(auth)/login');
    const on = !!favs[id];
    setFavs((p) => ({ ...p, [id]: !on }));
    if (on) {
      await supabase.from('favorites').delete()
        .eq('user_id', user.id).eq('property_id', id);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, property_id: id });
    }
  }

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  return (
    <View style={s.wrap}>
      <View style={s.topBar}>
        <View>
          <Text style={s.locLabel}>{T.locationLabel}</Text>
          <Text style={s.locValue}>
            {cities.length ? cities.join(', ') : T.allCountry}
          </Text>
        </View>
        <Pressable style={s.bell} onPress={() => router.replace('/messages')}>
          <Ionicons name="notifications-outline" size={19} color={C.primary} />
          {unread > 0 ? <View style={s.bellDot} /> : null}
        </Pressable>
      </View>

      <View style={s.segment}>
        <Pressable
          style={[s.segBtn, mode === 'sale' && s.segOn]}
          onPress={() => { setMode('sale'); setLoading(true); }}
        >
          <Text style={mode === 'sale' ? s.segTextOn : s.segText}>{T.sale}</Text>
        </Pressable>
        <Pressable
          style={[s.segBtn, mode === 'rent' && s.segOn]}
          onPress={() => { setMode('rent'); setLoading(true); }}
        >
          <Text style={mode === 'rent' ? s.segTextOn : s.segText}>{T.rent}</Text>
        </Pressable>
      </View>

      <MatchesBanner />

      <View style={s.searchRow}>
        <MultiCityInput
          cities={cities}
          setCities={(v) => { setCities(v); setLoading(true); }}
          placeholder={T.searchPlaceholder}
        />
        <Pressable style={s.filterBtn} onPress={() => setSheet(true)}>
          <Ionicons name="options-outline" size={20} color="#fff" />
          {activeCount > 0 ? (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {!user ? <Text style={s.notice}>{T.guestNotice}</Text> : null}

      <View style={s.sectionRow}>
        <Text style={s.section}>{T.sectionAll}</Text>
        <Text style={s.count}>{items.length}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={C.primary}
              onRefresh={() => { setRefreshing(true); load(); loadUnread(); }} />
          }
          ListEmptyComponent={<Text style={s.muted}>{T.empty}</Text>}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => router.push('/property/' + item.id)}>
              <View style={s.imgWrap}>
                {item.cover ? (
                  <Image source={{ uri: item.cover }} style={s.img} />
                ) : (
                  <View style={[s.img, s.imgEmpty]}>
                    <Ionicons name="image-outline" size={28} color={C.placeholderIcon} />
                  </View>
                )}
                <Pressable style={s.heart} onPress={() => toggleFav(item.id)}>
                  <Ionicons
                    name={favs[item.id] ? 'heart' : 'heart-outline'}
                    size={17}
                    color={favs[item.id] ? C.danger : C.primary}
                  />
                </Pressable>
                {user && item.property_type ? (
                  <View style={s.typeTag}>
                    <Text style={s.typeTagText}>{TYPES[item.property_type]}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.body}>
                {user ? <Text style={s.title} numberOfLines={1}>{item.title}</Text> : null}

                <View style={s.locRow}>
                  <Ionicons name="location-outline" size={13} color={C.textMuted} />
                  <Text style={s.loc} numberOfLines={1}>
                    {item.city}{user && item.neighborhood ? ', ' + item.neighborhood : ''}
                  </Text>
                </View>

                {user ? (
                  <View style={s.specs}>
                    <View style={s.spec}>
                      <Ionicons name="bed-outline" size={15} color={C.primary} />
                      <Text style={s.specText}>{item.bedrooms} {T.rooms}</Text>
                    </View>
                    <View style={s.spec}>
                      <Ionicons name="water-outline" size={15} color={C.primary} />
                      <Text style={s.specText}>{item.bathrooms}</Text>
                    </View>
                    <View style={s.spec}>
                      <Ionicons name="resize-outline" size={15} color={C.primary} />
                      <Text style={s.specText}>{item.area_sqm} {T.sqm}</Text>
                    </View>
                  </View>
                ) : null}

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

      <FilterSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        filters={filters}
        setFilters={setFilters}
        onApply={() => { setApplied(filters); setSheet(false); setLoading(true); }}
        onClear={() => { setFilters(EMPTY); setApplied(EMPTY); setSheet(false); setLoading(true); }}
      />

      <TabBar active="home" unread={unread} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page, paddingTop: 56 },
  topBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  locLabel: { fontSize: 11, color: C.textMuted, textAlign: 'right' },
  locValue: { fontSize: 14, color: C.text, fontWeight: '600', textAlign: 'right', maxWidth: 240 },
  bell: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, left: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger },
  segment: { flexDirection: 'row-reverse', backgroundColor: C.surface, borderRadius: 14, padding: 4, marginHorizontal: 16, marginBottom: 12 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: C.primary },
  segText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
  segTextOn: { color: '#fff', fontSize: 14, fontWeight: '600' },
  searchRow: { flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 16, alignItems: 'flex-start', zIndex: 10 },
  filterBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  filterBadge: { position: 'absolute', top: -5, left: -5, backgroundColor: C.danger, minWidth: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  notice: { color: C.textMuted, fontSize: 12, textAlign: 'right', paddingHorizontal: 16, marginTop: 12 },
  sectionRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16, marginTop: 16, marginBottom: 10 },
  section: { fontSize: 15, fontWeight: '600', color: C.text },
  count: { fontSize: 12, color: C.primary },
  card: { borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', backgroundColor: C.page },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: 160, backgroundColor: C.placeholder },
  imgEmpty: { alignItems: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', top: 10, left: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.93)', alignItems: 'center', justifyContent: 'center' },
  typeTag: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  typeTagText: { fontSize: 11, color: C.primary, fontWeight: '600' },
  body: { padding: 14 },
  title: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right' },
  locRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 5 },
  loc: { fontSize: 12, color: C.textMuted, flex: 1, textAlign: 'right' },
  specs: { flexDirection: 'row-reverse', gap: 14, marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#F0F2F6' },
  spec: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  specText: { fontSize: 11, color: C.textSecondary },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 5, marginTop: 9 },
  price: { fontSize: 18, fontWeight: '700', color: C.primary },
  perMonth: { fontSize: 12, color: C.textMuted },
  muted: { color: C.textMuted, textAlign: 'center', marginTop: 40 },
});