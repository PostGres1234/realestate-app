import { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator, RefreshControl, Alert, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { getSeenMap } from '../lib/inbox';

const T = {
  heading: 'נכסים',
  account: 'החשבון שלי',
  login: 'התחברות',
  messages: 'הודעות',
  guestNotice: 'גולשים לא רשומים רואים רק עיר ומחיר. התחברו כדי לראות את כל הפרטים.',
  cityLabel: 'עיר',
  cityPlaceholder: 'לדוגמה: חיפה',
  priceLabel: 'מחיר מקסימלי',
  pricePlaceholder: 'לדוגמה: 2000000',
  empty: 'לא נמצאו נכסים מתאימים',
  rooms: 'חדרים',
  baths: 'חדרי רחצה',
  sqm: 'מ"ר',
  addHome: 'הוספת נכס',
  myHomes: 'מחיקת נכס',
  needLoginTitle: 'נדרשת התחברות',
  needLoginBody: 'כדי לפרסם או למחוק נכס יש להתחבר לחשבון.',
  loginNow: 'התחברות',
  cancel: 'ביטול',
  noListingsTitle: 'אין נכסים למחיקה',
  noListingsBody: 'לא פרסמתם נכסים עדיין.',
  ok: 'הבנתי',
};

const TYPES = {
  apartment: 'דירה',
  house: 'בית פרטי',
  penthouse: 'פנטהאוז',
  land: 'מגרש',
  commercial: 'מסחרי',
};

export default function Browse() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const load = useCallback(async () => {
    const cols = user
      ? 'id, title, description, price, city, address, bedrooms, bathrooms, area_sqm, property_type'
      : 'id, price, city';

    let query = supabase
      .from('properties')
      .select(cols)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (q.trim()) query = query.ilike('city', '%' + q.trim() + '%');
    if (maxPrice) query = query.lte('price', Number(maxPrice));

    const { data, error } = await query;
    if (error) console.log('load error', error.message);
    setItems(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [q, maxPrice, user]);

  const loadUnread = useCallback(async () => {
    if (!user) { setUnread(0); return; }

    const { data: convos } = await supabase
      .from('conversations')
      .select('id');

    const ids = (convos ?? []).map((c) => c.id);
    if (!ids.length) { setUnread(0); return; }

    const seenMap = await getSeenMap(ids);

    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, created_at')
      .in('conversation_id', ids)
      .neq('sender_id', user.id);

    const count = (msgs ?? []).filter(
      (m) => new Date(m.created_at) > new Date(seenMap[m.conversation_id] ?? 0)
    ).length;

    setUnread(count);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
      loadUnread();
    }, [load, loadUnread])
  );

  function requireLogin() {
    Alert.alert(T.needLoginTitle, T.needLoginBody, [
      { text: T.cancel, style: 'cancel' },
      { text: T.loginNow, onPress: () => router.push('/(auth)/login') },
    ]);
    return false;
  }

  async function goAdd() {
    if (!user) return requireLogin();
    router.push('/sell/new');
  }

  async function goDelete() {
    if (!user) return requireLogin();
    const { data } = await supabase
      .from('properties')
      .select('id')
      .eq('seller_id', user.id)
      .limit(1);
    if (!data || data.length === 0) {
      return Alert.alert(T.noListingsTitle, T.noListingsBody, [{ text: T.ok }]);
    }
    router.push('/sell/mine');
  }

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.h1}>{T.heading}</Text>
        <View style={s.headerRight}>
          {user ? (
            <Pressable style={s.msgBtn} onPress={() => router.push('/messages')}>
              <Text style={s.link}>{T.messages}</Text>
              {unread > 0 ? (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unread}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push(user ? '/account' : '/(auth)/login')}>
            <Text style={s.link}>{user ? T.account : T.login}</Text>
          </Pressable>
        </View>
      </View>

      {!user ? <Text style={s.notice}>{T.guestNotice}</Text> : null}

      <View style={s.filters}>
        <View style={s.field}>
          <Text style={s.label}>{T.cityLabel}</Text>
          <TextInput
            style={s.input}
            placeholder={T.cityPlaceholder}
            placeholderTextColor="#aaa"
            value={q}
            onChangeText={setQ}
          />
        </View>

        <View style={s.fieldNarrow}>
          <Text style={s.label}>{T.priceLabel}</Text>
          <TextInput
            style={s.input}
            placeholder={T.pricePlaceholder}
            placeholderTextColor="#aaa"
            keyboardType="numeric"
            value={maxPrice}
            onChangeText={setMaxPrice}
          />
        </View>
      </View>

      <View style={s.menu}>
        <Pressable style={s.menuBtn} onPress={goAdd}>
          <Text style={s.menuText}>{T.addHome}</Text>
        </Pressable>
        <Pressable style={[s.menuBtn, s.menuBtnAlt]} onPress={goDelete}>
          <Text style={[s.menuText, s.menuTextAlt]}>{T.myHomes}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); loadUnread(); }} />
          }
          ListEmptyComponent={<Text style={s.muted}>{T.empty}</Text>}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => router.push('/property/' + item.id)}>
              <Text style={s.price}>{money(item.price)}</Text>
              <Text style={s.city}>{item.city}</Text>

              {user ? (
                <View style={{ gap: 4, marginTop: 6 }}>
                  <Text style={s.title}>{item.title}</Text>
                  <Text style={s.meta}>{item.address}</Text>
                  <Text style={s.meta}>
                    {item.bedrooms + ' ' + T.rooms + ' | ' +
                     item.bathrooms + ' ' + T.baths + ' | ' +
                     item.area_sqm + ' ' + T.sqm}
                  </Text>
                  <Text style={s.tag}>{TYPES[item.property_type] ?? item.property_type}</Text>
                  {item.description ? (
                    <Text style={s.desc}>{item.description}</Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 60, backgroundColor: '#fff' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  headerRight: { flexDirection: 'row-reverse', gap: 16, alignItems: 'center' },
  msgBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  badge: { backgroundColor: '#e5484d', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  h1: { fontSize: 28, fontWeight: '700', textAlign: 'right' },
  link: { color: '#1f6feb', fontWeight: '600' },
  notice: { color: '#8a6d3b', backgroundColor: '#fcf8e3', padding: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 8, textAlign: 'right', fontSize: 13 },
  filters: { flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  field: { flex: 2 },
  fieldNarrow: { flex: 1.3 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, textAlign: 'right', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 15, textAlign: 'right', backgroundColor: '#fff' },
  menu: { flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  menuBtn: { flex: 1, backgroundColor: '#1f6feb', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  menuBtnAlt: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5484d' },
  menuText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  menuTextAlt: { color: '#e5484d' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 16, backgroundColor: '#fafafa' },
  price: { fontSize: 20, fontWeight: '700', color: '#1f6feb', textAlign: 'right' },
  city: { fontSize: 16, fontWeight: '600', marginTop: 4, textAlign: 'right' },
  title: { fontSize: 16, fontWeight: '600', textAlign: 'right' },
  meta: { color: '#666', fontSize: 14, textAlign: 'right' },
  tag: { alignSelf: 'flex-end', backgroundColor: '#eaf1ff', color: '#1f6feb', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  desc: { color: '#444', fontSize: 14, lineHeight: 20, textAlign: 'right', marginTop: 2 },
  muted: { color: '#666', textAlign: 'center', marginTop: 40 },
});