import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';

const T = {
  one: 'נכס חדש מתאים לכם',
  many: 'נכסים חדשים מתאימים לכם',
  sub: 'לפי ההעדפות שהגדרתם',
  setup: 'הגדירו העדפות',
  setupSub: 'ונעדכן אתכם על נכסים מתאימים',
};

export default function MatchesBanner() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [hasPrefs, setHasPrefs] = useState(true);

  const check = useCallback(async () => {
    if (!user) { setCount(0); return; }

    const { data: pref } = await supabase
      .from('preferences').select('user_id')
      .eq('user_id', user.id).maybeSingle();

    if (!pref) { setHasPrefs(false); setCount(0); return; }
    setHasPrefs(true);

    const { data, error } = await supabase.rpc('my_new_matches');
    if (error) { console.log('matches error', error.message); return; }
    setCount((data ?? []).length);
  }, [user]);

  useFocusEffect(useCallback(() => { check(); }, [check]));

  if (!user) return null;

  if (!hasPrefs) {
    return (
      <Pressable style={s.card} onPress={() => router.push('/preferences')}>
        <View style={s.iconMuted}>
          <Ionicons name="options-outline" size={18} color={C.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.titleMuted}>{T.setup}</Text>
          <Text style={s.sub}>{T.setupSub}</Text>
        </View>
        <Ionicons name="chevron-back" size={18} color={C.textMuted} />
      </Pressable>
    );
  }

  if (count === 0) return null;

  return (
    <Pressable style={s.cardOn} onPress={() => router.push('/matches')}>
      <View style={s.icon}>
        <Ionicons name="sparkles-outline" size={18} color={C.primary} />
        <View style={s.dot} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>
          {count} {count === 1 ? T.one : T.many}
        </Text>
        <Text style={s.sub}>{T.sub}</Text>
      </View>
      <Ionicons name="chevron-back" size={18} color={C.primary} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, backgroundColor: C.surface, marginHorizontal: 16, marginTop: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  cardOn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, backgroundColor: C.primaryTint, marginHorizontal: 16, marginTop: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  iconMuted: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.page, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 6, left: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: C.danger },
  title: { fontSize: 14, fontWeight: '700', color: C.primary, textAlign: 'right' },
  titleMuted: { fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'right' },
  sub: { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 2 },
});