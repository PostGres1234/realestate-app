import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const T = {
  back: 'חזרה',
  loadFail: 'לא ניתן לטעון את הנכס',
  rooms: 'חדרים',
  baths: 'חדרי רחצה',
  sqm: 'מ"ר',
  locked: 'התחברו כדי לראות תיאור מלא, כתובת, מספר חדרים ושטח.',
  ctaGuest: 'התחברו כדי ליצור קשר',
  ctaFree: 'הירשמו למנוי כדי ליצור קשר',
  ctaPaid: 'צרו קשר עם המוכר',
  error: 'שגיאה',
};

export default function PropertyDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    (async () => {
      const cols = user ? '*' : 'id, city, price';
      const { data, error } = await supabase
        .from('properties')
        .select(cols)
        .eq('id', id)
        .single();

      if (error) {
        console.log('detail error', error.message);
        setErr(error.message);
        return;
      }
      setP(data);
    })();
  }, [id, user]);

  useEffect(() => {
    if (!user) return setSubscribed(false);
    (async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);
      setSubscribed((data ?? []).length > 0);
    })();
  }, [user]);

  async function contactSeller() {
    if (!user) return router.push('/(auth)/login');
    if (!subscribed) return router.push('/subscribe');

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('property_id', p.id)
      .eq('buyer_id', user.id)
      .maybeSingle();

    if (existing) return router.push('/chat/' + existing.id);

    const { data, error } = await supabase
      .from('conversations')
      .insert({ property_id: p.id, buyer_id: user.id, seller_id: p.seller_id })
      .select('id')
      .single();

    if (error) return Alert.alert(T.error, error.message);
    router.push('/chat/' + data.id);
  }

  if (err) {
    return (
      <View style={s.center}>
        <Text style={s.errTitle}>{T.loadFail}</Text>
        <Text style={s.meta}>{err}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={s.link}>{T.back}</Text>
        </Pressable>
      </View>
    );
  }

  if (!p) return <ActivityIndicator style={{ marginTop: 80 }} size="large" />;

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  let cta = T.ctaGuest;
  if (user && subscribed) cta = T.ctaPaid;
  else if (user) cta = T.ctaFree;

  const specs = p.bedrooms + ' ' + T.rooms + ' | ' + p.bathrooms + ' ' + T.baths + ' | ' + p.area_sqm + ' ' + T.sqm;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 20, paddingTop: 60, gap: 12 }}>
      <Pressable onPress={() => router.back()}>
        <Text style={s.link}>{T.back}</Text>
      </Pressable>

      <Text style={s.price}>{money(p.price)}</Text>
      <Text style={s.city}>{p.city}</Text>

      {user ? (
        <View style={{ gap: 8 }}>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.meta}>{p.address}</Text>
          <Text style={s.meta}>{specs}</Text>
          {p.description ? <Text style={s.body}>{p.description}</Text> : null}
        </View>
      ) : (
        <View style={s.lock}>
          <Text style={s.lockText}>{T.locked}</Text>
        </View>
      )}

      <Pressable style={s.btn} onPress={contactSeller}>
        <Text style={s.btnText}>{cta}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  errTitle: { fontSize: 18, fontWeight: '600', textAlign: 'right' },
  link: { color: '#1f6feb', fontWeight: '600', fontSize: 16, textAlign: 'right' },
  price: { fontSize: 28, fontWeight: '700', color: '#1f6feb', marginTop: 8, textAlign: 'right' },
  city: { fontSize: 20, fontWeight: '600', textAlign: 'right' },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'right' },
  meta: { color: '#666', fontSize: 15, textAlign: 'right' },
  body: { fontSize: 16, lineHeight: 24, textAlign: 'right' },
  lock: { backgroundColor: '#f5f5f5', padding: 16, borderRadius: 10, marginTop: 8 },
  lockText: { color: '#666', textAlign: 'right', lineHeight: 22 },
  btn: { backgroundColor: '#1f6feb', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});