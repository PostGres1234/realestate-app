import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { logSupabase } from '../lib/logger';
import { C } from '../lib/theme';
import TabBar from '../components/TabBar';

const T = {
  
  editProfile: 'עריכת פרופיל',
  editProfileHint: 'שם, טלפון, עיסוק והגדרות שיחות',
  myListings: 'הנכסים שלי',
  myListingsHint: 'עריכה ומחיקה של נכסים שפרסמתם',
  addListing: 'הוספת נכס',
  addListingHint: 'פרסום נכס חדש למכירה או השכרה',
  prefs: 'ההעדפות שלי',
  prefsHint: 'עדכונים על נכסים שמתאימים לכם',
  recent: 'נצפו לאחרונה',
  recentHint: 'נכסים שפתחתם',
  assistant: 'ג׳ימי',
  assistantHint: 'היועץ שיעזור לכם למצוא אזור מתאים',
  logout: 'התנתקות',
  guest: 'התחברו כדי לנהל את החשבון שלכם',
  login: 'התחברות',
  listings: 'נכסים',
};

export default function Account() {
  const { user } = useAuth();
  const [count, setCount] = useState(null);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('properties')
      .select('id')
      .eq('seller_id', user.id);
    if (error) logSupabase('account.listings', error);
    setCount((data ?? []).length);

    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    if (prof?.full_name) setName(prof.full_name);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) {
    return (
      <View style={s.wrap}>
        <View style={s.center}>
          <Ionicons name="person-circle-outline" size={70} color={C.textMuted} />
          <Text style={s.guestText}>{T.guest}</Text>
          <Pressable style={s.btn} onPress={() => router.push('/subscribe')}>
            <Text style={s.btnText}>{T.login}</Text>
          </Pressable>
        </View>
        <TabBar active="profile" />
      </View>
    );
  }

  const initials = (name || user.email || '?').slice(0, 2).toUpperCase();

  const rows = [
    { icon: 'person-outline', label: T.editProfile, hint: T.editProfileHint, path: '/edit-profile' },
    { icon: 'home-outline', label: T.myListings, hint: T.myListingsHint, path: '/sell/mine', badge: count },
    { icon: 'add-circle-outline', label: T.addListing, hint: T.addListingHint, path: '/sell/new' },
    { icon: 'options-outline', label: T.prefs, hint: T.prefsHint, path: '/preferences' },
    { icon: 'sparkles-outline', label: T.assistant, hint: T.assistantHint, path: '/assistant' },
    { icon: 'time-outline', label: T.recent, hint: T.recentHint, path: '/recent' },
  ];

  return (
    <View style={s.wrap}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Text style={s.h1}>{T.heading}</Text>

          <View style={s.profile}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{name || user.email}</Text>
              <Text style={s.email} numberOfLines={1}>{user.email}</Text>
              {count !== null ? (
                <View style={s.statPill}>
                  <Ionicons name="home" size={12} color={C.primary} />
                  <Text style={s.statText}>{count + ' ' + T.listings}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={s.list}>
          {rows.map((r) => (
            <Pressable key={r.path} style={s.row} onPress={() => router.push(r.path)}>
              <View style={s.rowIcon}>
                <Ionicons name={r.icon} size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{r.label}</Text>
                <Text style={s.rowHint}>{r.hint}</Text>
              </View>
              {r.badge ? (
                <View style={s.pill}>
                  <Text style={s.pillText}>{r.badge}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-back" size={18} color={C.textMuted} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={s.logout}
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace('/');
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={C.danger} />
          <Text style={s.logoutText}>{T.logout}</Text>
        </Pressable>
      </ScrollView>

      <TabBar active="profile" />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F4F6FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  guestText: { color: C.textSecondary, textAlign: 'center', fontSize: 16 },
  hero: { backgroundColor: C.page, paddingTop: 44, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  h1: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'right', marginBottom: 18 },
  profile: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.primary, fontWeight: '800', fontSize: 21 },
  name: { fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'right' },
  email: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 2 },
  statPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, alignSelf: 'flex-end', backgroundColor: C.primaryTint, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, marginTop: 7 },
  statText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  list: { gap: 10, paddingHorizontal: 16, paddingTop: 18 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: C.page, borderRadius: 16, padding: 14, shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right' },
  rowHint: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 2 },
  pill: { backgroundColor: C.primaryTint, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  logout: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: C.danger, borderRadius: 14, paddingVertical: 14, marginHorizontal: 16, marginTop: 22 },
  logoutText: { color: C.danger, fontWeight: '600', fontSize: 15 },
});