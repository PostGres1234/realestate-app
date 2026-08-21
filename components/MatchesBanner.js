import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';

const T = {
  one: 'נכס חדש מתאים להעדפות שלכם',
  many: 'נכסים חדשים מתאימים להעדפות שלכם',
  view: 'צפייה',
  setup: 'הגדירו העדפות וקבלו עדכון על נכסים מתאימים',
  setupCta: 'הגדרה',
};

export default function MatchesBanner() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [hasPrefs, setHasPrefs] = useState(true);

  const check = useCallback(async () => {
    if (!user) { setCount(0); return; }

    const { data: pref } = await supabase
      .from('preferences')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

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
      <Pressable style={s.soft} onPress={() => router.push('/preferences')}>
        <Ionicons name="options-outline" size={18} color={C.textSecondary} />
        <Text style={s.softText}>{T.setup}</Text>
        <Text style={s.softCta}>{T.setupCta}</Text>
      </Pressable>
    );
  }

  if (count === 0) return null;

  return (
    <Pressable style={s.bar} onPress={() => router.push('/matches')}>
      <View style={s.badge}>
        <Text style={s.badgeText}>{count}</Text>
      </View>
      <Text style={s.text}>{count === 1 ? T.one : T.many}</Text>
      <Text style={s.cta}>{T.view}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: C.primary, marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  badge: { backgroundColor: 'rgba(255,255,255,0.25)', minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  text: { color: '#fff', fontSize: 13, flex: 1, textAlign: 'right' },
  cta: { color: '#fff', fontSize: 13, fontWeight: '700' },
  soft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, backgroundColor: C.surface, marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  softText: { color: C.textSecondary, fontSize: 12, flex: 1, textAlign: 'right' },
  softCta: { color: C.primary, fontSize: 12, fontWeight: '700' },
});