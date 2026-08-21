import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';

const T = {
  heading: 'הנכסים שלי',
  back: 'חזרה',
  empty: 'לא פרסמתם נכסים עדיין.',
  addNow: 'הוספת נכס',
  edit: 'עריכת פרטי הנכס',
  del: 'מחיקת הנכס',
  confirmTitle: 'מחיקת נכס',
  confirmBody: 'הפעולה אינה הפיכה. למחוק את הנכס?',
  cancel: 'ביטול',
  confirmDel: 'מחק',
  failTitle: 'המחיקה נכשלה',
  rooms: 'חדרים',
  sqm: 'מ"ר',
};

const STATUS_LABEL = {
  active: 'פעיל',
  pending: 'בהמתנה',
  sold: 'נמכר',
  draft: 'טיוטה',
};

export default function MyListings() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, price, city, bedrooms, area_sqm, status')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) console.log('mine error', error.message);

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

    setRows(list);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(item) {
    Alert.alert(T.confirmTitle, T.confirmBody, [
      { text: T.cancel, style: 'cancel' },
      {
        text: T.confirmDel,
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', item.id);
          if (error) {
            console.log('delete error', error.message);
            return Alert.alert(T.failTitle, error.message);
          }
          setRows((prev) => prev.filter((r) => r.id !== item.id));
        },
      },
    ]);
  }

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
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50, gap: 18 }}>
              <Ionicons name="home-outline" size={54} color={C.textMuted} />
              <Text style={s.muted}>{T.empty}</Text>
              <Pressable style={s.btn} onPress={() => router.replace('/sell/new')}>
                <Text style={s.btnText}>{T.addNow}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.imgWrap}>
                {item.cover ? (
                  <Image source={{ uri: item.cover }} style={s.img} />
                ) : (
                  <View style={[s.img, s.imgEmpty]}>
                    <Ionicons name="image-outline" size={26} color={C.placeholderIcon} />
                  </View>
                )}
                {item.status !== 'active' ? (
                  <View style={s.statusTag}>
                    <Text style={s.statusText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.body}>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                <View style={s.locRow}>
                  <Ionicons name="location-outline" size={13} color={C.textMuted} />
                  <Text style={s.loc}>{item.city}</Text>
                </View>
                <Text style={s.meta}>
                  {(item.bedrooms ?? '-') + ' ' + T.rooms + '  ·  ' + (item.area_sqm ?? '-') + ' ' + T.sqm}
                </Text>
                <Text style={s.price}>{money(item.price)}</Text>

                <View style={s.actions}>
                  <Pressable style={s.editBtn} onPress={() => router.push('/sell/edit/' + item.id)}>
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={s.editText}>{T.edit}</Text>
                  </Pressable>

                  <Pressable style={s.delBtn} onPress={() => confirmDelete(item)}>
                    <Ionicons name="trash-outline" size={16} color={C.danger} />
                    <Text style={s.delText}>{T.del}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page, paddingTop: 56 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 18 },
  h1: { fontSize: 26, fontWeight: '700', color: C.text, textAlign: 'right' },
  link: { color: C.primary, fontWeight: '600', fontSize: 15 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: 150, backgroundColor: C.placeholder },
  imgEmpty: { alignItems: 'center', justifyContent: 'center' },
  statusTag: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, color: C.danger, fontWeight: '700' },
  body: { padding: 14 },
  title: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right' },
  locRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 5 },
  loc: { fontSize: 12, color: C.textMuted },
  meta: { fontSize: 12, color: C.textSecondary, textAlign: 'right', marginTop: 5 },
  price: { fontSize: 18, fontWeight: '700', color: C.primary, marginTop: 8, textAlign: 'right' },
  actions: { gap: 8, marginTop: 12 },
  editBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 11 },
  editText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  delBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: C.danger, borderRadius: 12, paddingVertical: 11 },
  delText: { color: C.danger, fontWeight: '600', fontSize: 14 },
  btn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});