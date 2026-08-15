import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const T = {
  heading: 'הנכסים שלי',
  back: 'חזרה',
  empty: 'לא פרסמתם נכסים עדיין.',
  addNow: 'הוספת נכס',
  del: 'מחיקה',
  confirmTitle: 'מחיקת נכס',
  confirmBody: 'הפעולה אינה הפיכה. למחוק את הנכס?',
  cancel: 'ביטול',
  confirmDel: 'מחק',
  failTitle: 'המחיקה נכשלה',
  rooms: 'חדרים',
  sqm: 'מ"ר',
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
    setRows(data ?? []);
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
        <Pressable onPress={() => router.replace('/')}>
          <Text style={s.link}>{T.back}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40, gap: 16 }}>
              <Text style={s.muted}>{T.empty}</Text>
              <Pressable style={s.btn} onPress={() => router.replace('/sell/new')}>
                <Text style={s.btnText}>{T.addNow}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.price}>{money(item.price)}</Text>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.meta}>{item.city}</Text>
              <Text style={s.meta}>
                {(item.bedrooms ?? '-') + ' ' + T.rooms + ' | ' +
                 (item.area_sqm ?? '-') + ' ' + T.sqm}
              </Text>
              <Pressable style={s.delBtn} onPress={() => confirmDelete(item)}>
                <Text style={s.delText}>{T.del}</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 60, backgroundColor: '#fff' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  h1: { fontSize: 28, fontWeight: '700', textAlign: 'right' },
  link: { color: '#1f6feb', fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 16, backgroundColor: '#fafafa' },
  price: { fontSize: 20, fontWeight: '700', color: '#1f6feb', textAlign: 'right' },
  title: { fontSize: 16, fontWeight: '600', marginTop: 4, textAlign: 'right' },
  meta: { color: '#666', fontSize: 14, marginTop: 2, textAlign: 'right' },
  delBtn: { borderWidth: 1, borderColor: '#e5484d', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  delText: { color: '#e5484d', fontWeight: '600' },
  btn: { backgroundColor: '#1f6feb', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  muted: { color: '#666', textAlign: 'center' },
});