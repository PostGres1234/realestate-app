import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';
import TabBar from '../components/TabBar';

const T = {
  heading: 'נכסים שמורים',
  empty: 'לא שמרתם נכסים עדיין.',
  rooms: 'חדרים',
  sqm: 'מ"ר',
};

export default function Saved() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data: favs } = await supabase
      .from('favorites')
      .select('property_id');

    const ids = (favs ?? []).map((f) => f.property_id);
    if (!ids.length) { setItems([]); setLoading(false); return; }

    const { data } = await supabase
      .from('properties')
      .select('id, title, price, city, bedrooms, area_sqm')
      .in('id', ids)
      .eq('status', 'active');

    const list = data ?? [];
    if (list.length) {
      const { data: imgs } = await supabase
        .from('property_images')
        .select('property_id, url, position')
        .in('property_id', list.map((x) => x.id))
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

  async function remove(id) {
    setItems((p) => p.filter((x) => x.id !== id));
    await supabase.from('favorites').delete()
      .eq('user_id', user.id).eq('property_id', id);
  }

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>{T.heading}</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
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
                <Pressable style={s.heart} onPress={() => remove(item.id)}>
                  <Ionicons name="heart" size={17} color={C.danger} />
                </Pressable>
              </View>
              <View style={s.body}>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                <View style={s.locRow}>
                  <Ionicons name="location-outline" size={13} color={C.textMuted} />
                  <Text style={s.loc}>{item.city}</Text>
                </View>
                <Text style={s.price}>{money(item.price)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <TabBar active="saved" />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page, paddingTop: 56 },
  h1: { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'right', paddingHorizontal: 16, marginBottom: 16 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: 160, backgroundColor: C.placeholder },
  imgEmpty: { alignItems: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', top: 10, left: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.93)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 14 },
  title: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right' },
  locRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 5 },
  loc: { fontSize: 12, color: C.textMuted },
  price: { fontSize: 18, fontWeight: '700', color: C.primary, marginTop: 9, textAlign: 'right' },
  muted: { color: C.textMuted, textAlign: 'center', marginTop: 40 },
});