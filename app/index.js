import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { getSeenMap } from '../lib/inbox';
import { logSupabase } from '../lib/logger';
import { C } from '../lib/theme';
import TabBar from '../components/TabBar';
import CityPicker from '../components/CityPicker';
import FilterSheet, { FEATURES } from '../components/FilterSheet';
import MatchesBanner from '../components/MatchesBanner';

const T = {
  locationLabel: 'מחפשים ב־',
  allCountry: 'כל הארץ',
  searchPlaceholder: 'חיפוש עיר או שכונה...',
  sale: 'למכירה',
  rent: 'להשכרה',
  fresh: 'חדש באפליקציה',
  freshHint: 'פורסמו בשבוע האחרון',
  all: 'כל הנכסים',
  results: 'תוצאות',
  guestNotice: 'ללא חשבון מוצגים רק עיר ומחיר',
  empty: 'לא נמצאו נכסים מתאימים',
  rooms: 'חד׳',
  sqm: 'מ"ר',
  perMonth: 'לחודש',
  newTag: 'חדש',
};

const CATS = [
  { key: null, label: 'הכל', icon: 'apps-outline' },
  { key: 'apartment', label: 'דירה', icon: 'business-outline' },
  { key: 'house', label: 'בית פרטי', icon: 'home-outline' },
  { key: 'penthouse', label: 'פנטהאוז', icon: 'diamond-outline' },
];

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

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function Browse() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [favs, setFavs] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [cities, setCities] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mode, setMode] = useState('sale');
  const [cat, setCat] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);

  const activeCount = Object.entries(applied).filter(([k, v]) =>
    typeof v === 'boolean' ? v : String(v).length > 0
  ).length;

  const load = useCallback(async () => {
    const cols = user
      ? 'id, title, price, city, neighborhood, bedrooms, bathrooms, area_sqm, property_type, listing_type, created_at'
      : 'id, price, city, listing_type, created_at';

    let query = supabase
      .from('properties')
      .select(cols)
      .eq('status', 'active')
      .eq('listing_type', mode);

    if (user) query = query.neq('seller_id', user.id);

    if (cities.length) {
      query = user
        ? query.or(
            cities.map((c) => 'city.eq.' + c).join(',') + ',' +
            cities.map((c) => 'neighborhood.eq.' + c).join(',')
          )
        : query.in('city', cities);
    }

    if (cat && user) query = query.eq('property_type', cat);
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

    query = query.order('created_at', { ascending: false }).limit(50);

    const { data, error } = await query;
    if (error) logSupabase('browse.load', error, { mode, cityCount: cities.length });

    const list = data ?? [];
    if (list.length) {
      const ids = list.map((x) => x.id);
      const { data: imgs, error: imgErr } = await supabase
        .from('property_images')
        .select('property_id, url, position, media_type')
        .in('property_id', ids)
        .eq('media_type', 'image')
        .order('position', { ascending: true });

      if (imgErr) logSupabase('browse.covers', imgErr);

      const covers = {};
      (imgs ?? []).forEach((im) => {
        if (!covers[im.property_id]) covers[im.property_id] = im.url;
      });
      list.forEach((x) => { x.cover = covers[x.id] ?? null; });

      if (user) {
        const { data: f, error: favErr } = await supabase
          .from('favorites').select('property_id').in('property_id', ids);
        if (favErr) logSupabase('browse.favorites', favErr);
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
  }, [cities, applied, mode, cat, user]);

  const loadUnread = useCallback(async () => {
    if (!user) { setUnread(0); return; }
    const { data: convos, error } = await supabase.from('conversations').select('id');
    if (error) logSupabase('browse.unread', error);

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
    if (!user) return router.push('/subscribe');
    const on = !!favs[id];
    setFavs((p) => ({ ...p, [id]: !on }));

    if (on) {
      const { error } = await supabase.from('favorites').delete()
        .eq('user_id', user.id).eq('property_id', id);
      if (error) logSupabase('favorite.remove', error);
    } else {
      const { error } = await supabase.from('favorites')
        .insert({ user_id: user.id, property_id: id });
      if (error) logSupabase('favorite.add', error);
    }
  }

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);
  const isNew = (iso) => Date.now() - new Date(iso).getTime() < WEEK;

  const fresh = items.filter((x) => isNew(x.created_at)).slice(0, 10);

  const locationLabel = cities.length === 0
    ? T.allCountry
    : cities.length <= 2
      ? cities.join(', ')
      : cities[0] + ' +' + (cities.length - 1);

  function Header() {
    return (
      <View>
        <View style={s.topArea}>
          <View style={s.topBar}>
            <Pressable style={s.locBtn} onPress={() => setPickerOpen(true)}>
              <Text style={s.locLabel}>{T.locationLabel}</Text>
              <View style={s.locRow}>
                <Ionicons name="location" size={15} color={C.primary} />
                <Text style={s.locValue} numberOfLines={1}>{locationLabel}</Text>
                <Ionicons name="chevron-down" size={16} color={C.text} />
              </View>
            </Pressable>

            <View style={s.icons}>
            <Pressable style={s.iconBtn} onPress={() => router.push('/saved')}>
              <Ionicons name="heart-outline" size={19} color={C.primary} />
            </Pressable>
            <Pressable style={s.iconBtn} onPress={() => router.push('/map')}>
              <Ionicons name="map-outline" size={19} color={C.primary} />
            </Pressable>
            <Pressable style={s.iconBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={19} color={C.primary} />
              {unread > 0 ? <View style={s.bellDot} /> : null}
            </Pressable>
          </View>
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

          <Pressable style={s.searchBar} onPress={() => setPickerOpen(true)}>
            <Ionicons name="search" size={18} color={C.textMuted} />
            <Text style={s.searchText}>{T.searchPlaceholder}</Text>
            <Pressable style={s.filterInline} onPress={() => setSheet(true)} hitSlop={8}>
              <Ionicons name="options-outline" size={19} color={C.primary} />
              {activeCount > 0 ? (
                <View style={s.filterBadge}>
                  <Text style={s.filterBadgeText}>{activeCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </Pressable>

          {user ? (
            <View style={s.cats}>
              {CATS.map((c) => {
                const on = cat === c.key;
                return (
                  <Pressable
                    key={c.label}
                    style={[s.cat, on && s.catOn]}
                    onPress={() => { setCat(c.key); setLoading(true); }}
                  >
                    <Ionicons name={c.icon} size={22} color={on ? '#fff' : C.primary} />
                    <Text style={on ? s.catTextOn : s.catText}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={s.notice}>{T.guestNotice}</Text>
          )}

          <MatchesBanner />
        </View>

        {fresh.length ? (
          <View>
            <View style={s.sectionRow}>
              <View>
                <Text style={s.section}>{T.fresh}</Text>
                <Text style={s.sectionHint}>{T.freshHint}</Text>
              </View>
              <View style={s.freshCount}>
                <Text style={s.freshCountText}>{fresh.length}</Text>
              </View>
            </View>

            <FlatList
              horizontal
              data={fresh}
              keyExtractor={(x) => 'f' + x.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingVertical: 12 }}
              renderItem={({ item }) => (
                <Pressable style={s.mini} onPress={() => router.push('/property/' + item.id)}>
                  <View style={s.miniImgWrap}>
                    {item.cover ? (
                      <Image source={{ uri: item.cover }} style={s.miniImg} />
                    ) : (
                      <View style={[s.miniImg, s.imgEmpty]}>
                        <Ionicons name="image-outline" size={24} color={C.placeholderIcon} />
                      </View>
                    )}
                    <View style={s.newTag}>
                      <Text style={s.newTagText}>{T.newTag}</Text>
                    </View>
                  </View>
                  <View style={s.miniBody}>
                    <Text style={s.miniPrice}>
                      {money(item.price)}
                      {item.listing_type === 'rent' ? ' ' + T.perMonth : ''}
                    </Text>
                    <Text style={s.miniCity} numberOfLines={1}>
                      {user && item.neighborhood
                        ? item.city + ', ' + item.neighborhood
                        : item.city}
                    </Text>
                    {user ? (
                      <Text style={s.miniMeta} numberOfLines={1}>
                        {(item.bedrooms ?? '-') + ' ' + T.rooms + '  ·  ' + (item.area_sqm ?? '-') + ' ' + T.sqm}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        <View style={s.sectionRow}>
          <Text style={s.section}>{T.all}</Text>
          <Text style={s.count}>{items.length + ' ' + T.results}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      {loading ? (
        <View>
          <Header />
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<Header />}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={C.primary}
              onRefresh={() => { setRefreshing(true); load(); loadUnread(); }} />
          }
          ListEmptyComponent={<Text style={s.muted}>{T.empty}</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={s.card}
              onPress={() => router.push('/property/' + item.id)}
            >
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

                <Pressable style={s.heart} onPress={() => toggleFav(item.id)}>
                  <Ionicons
                    name={favs[item.id] ? 'heart' : 'heart-outline'}
                    size={18}
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
                {user ? (
                  <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                ) : null}

                <View style={s.cardLocRow}>
                  <Ionicons name="location-outline" size={14} color={C.textMuted} />
                  <Text style={s.loc} numberOfLines={1}>
                    {user && item.neighborhood
                      ? item.city + ', ' + item.neighborhood
                      : item.city}
                  </Text>
                </View>

                {user ? (
                  <View style={s.specs}>
                    <View style={s.spec}>
                      <Ionicons name="bed-outline" size={16} color={C.primary} />
                      <Text style={s.specText}>{item.bedrooms + ' ' + T.rooms}</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.spec}>
                      <Ionicons name="water-outline" size={16} color={C.primary} />
                      <Text style={s.specText}>{item.bathrooms}</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.spec}>
                      <Ionicons name="resize-outline" size={16} color={C.primary} />
                      <Text style={s.specText}>{item.area_sqm + ' ' + T.sqm}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}

      <CityPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={cities}
        onApply={(v) => { setCities(v); setLoading(true); }}
      />

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
  wrap: { flex: 1, backgroundColor: '#F4F6FA' },
  topArea: { backgroundColor: C.page, paddingTop: 56, paddingBottom: 14, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  topBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14, gap: 12 },
  locBtn: { flex: 1 },
  locLabel: { fontSize: 11, color: C.textMuted, textAlign: 'right' },
  locRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 2 },
  locValue: { fontSize: 15, color: C.text, fontWeight: '700', maxWidth: 180 },
  icons: { flexDirection: 'row-reverse', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 9, left: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger },
  segment: { flexDirection: 'row-reverse', backgroundColor: C.surface, borderRadius: 14, padding: 4, marginHorizontal: 16 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: C.primary },
  segText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
  segTextOn: { color: '#fff', fontSize: 14, fontWeight: '600' },
  searchBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: C.surface, marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  searchText: { flex: 1, fontSize: 14, color: '#A9B0BF', textAlign: 'right' },
  filterInline: { paddingLeft: 2 },
  filterBadge: { position: 'absolute', top: -6, left: -8, backgroundColor: C.danger, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  cats: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 16, marginTop: 14 },
  cat: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingVertical: 13, alignItems: 'center', gap: 5 },
  catOn: { backgroundColor: C.primary, borderColor: C.primary },
  catText: { fontSize: 11, color: C.textSecondary, fontWeight: '600' },
  catTextOn: { fontSize: 11, color: '#fff', fontWeight: '600' },
  notice: { color: C.textMuted, fontSize: 12, textAlign: 'right', paddingHorizontal: 16, marginTop: 12 },
  sectionRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20 },
  section: { fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'right' },
  sectionHint: { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 2 },
  count: { fontSize: 12, color: C.textMuted },
  freshCount: { backgroundColor: C.primaryTint, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  freshCountText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  mini: { width: 200, borderRadius: 16, backgroundColor: C.page, overflow: 'hidden', shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  miniImgWrap: { position: 'relative' },
  miniImg: { width: '100%', height: 110, backgroundColor: C.placeholder },
  newTag: { position: 'absolute', top: 9, right: 9, backgroundColor: '#1D9E75', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  newTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  miniBody: { padding: 11 },
  miniPrice: { fontSize: 15, fontWeight: '800', color: C.primary, textAlign: 'right' },
  miniCity: { fontSize: 12, color: C.text, fontWeight: '600', textAlign: 'right', marginTop: 3 },
  miniMeta: { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 3 },
  card: { borderRadius: 18, backgroundColor: C.page, overflow: 'hidden', marginHorizontal: 16, marginTop: 14, shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: 180, backgroundColor: C.placeholder },
  imgEmpty: { alignItems: 'center', justifyContent: 'center' },
  priceBadge: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 7, shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  priceBadgeText: { fontSize: 17, fontWeight: '800', color: C.primary },
  priceBadgeSub: { fontSize: 11, color: C.textMuted },
  heart: { position: 'absolute', top: 12, left: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  typeTag: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeTagText: { fontSize: 11, color: C.primary, fontWeight: '700' },
  body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right' },
  cardLocRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 5 },
  loc: { fontSize: 13, color: C.textMuted, flex: 1, textAlign: 'right' },
  specs: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  spec: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  specText: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  divider: { width: 1, height: 14, backgroundColor: '#E6EAF2' },
  muted: { color: C.textMuted, textAlign: 'center', marginTop: 40 },
});