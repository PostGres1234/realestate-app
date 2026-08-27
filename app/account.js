import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';
import TabBar from '../components/TabBar';

const T = {
  heading: 'הפרופיל שלי',
  myListings: 'הנכסים שלי',
  myListingsHint: 'עריכה ומחיקה של נכסים שפרסמתם',
  addListing: 'הוספת נכס',
  addListingHint: 'פרסום נכס חדש למכירה',
  prefs: 'ההעדפות שלי',
  prefsHint: 'עדכונים על נכסים שמתאימים לכם',
  saved: 'נכסים שמורים',
  savedHint: 'הרשימה השמורה שלכם',
  logout: 'התנתקות',
  guest: 'התחברו כדי לנהל את החשבון שלכם.',
  login: 'התחברות',
  listings: 'נכסים',
  editProfile: 'עריכת פרופיל',
  editProfileHint: 'שם, טלפון, עיסוק והגדרות שיחות',
};

export default function Account() {
  const { user } = useAuth();
  const [count, setCount] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('properties')
      .select('id')
      .eq('seller_id', user.id);
    setCount((data ?? []).length);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) {
    return (
      <View style={s.wrap}>
        <View style={s.center}>
          <Ionicons name="person-circle-outline" size={64} color={C.textMuted} />
          <Text style={s.muted}>{T.guest}</Text>
          <Pressable style={s.btn} onPress={() => router.push('/(auth)/login')}>
            <Text style={s.btnText}>{T.login}</Text>
          </Pressable>
        </View>
        <TabBar active="profile" />
      </View>
    );
  }

  const initials = (user.email ?? '?').slice(0, 2).toUpperCase();

  const rows = [
    { icon: 'person-outline', label: T.editProfile, hint: T.editProfileHint, path: '/edit-profile' },
    { icon: 'home-outline', label: T.myListings, hint: T.myListingsHint, path: '/sell/mine', badge: count },
    { icon: 'add-circle-outline', label: T.addListing, hint: T.addListingHint, path: '/sell/new' },
    { icon: 'options-outline', label: T.prefs, hint: T.prefsHint, path: '/preferences' },
    { icon: 'heart-outline', label: T.saved, hint: T.savedHint, path: '/saved' },
  ];

  return (
    <View style={s.wrap}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
        <Text style={s.h1}>{T.heading}</Text>

        <View style={s.profile}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.email} numberOfLines={1}>{user.email}</Text>
            {count !== null ? (
              <Text style={s.sub}>{count} {T.listings}</Text>
            ) : null}
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
          <Text style={s.logoutText}>{T.logout}</Text>
        </Pressable>
      </ScrollView>

      <TabBar active="profile" />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  h1: { fontSize: 26, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 20 },
  profile: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.primary, fontWeight: '700', fontSize: 17 },
  email: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right' },
  sub: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 3 },
  list: { gap: 10 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right' },
  rowHint: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 2 },
  pill: { backgroundColor: C.primaryTint, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  logout: { borderWidth: 1, borderColor: C.danger, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  logoutText: { color: C.danger, fontWeight: '600', fontSize: 15 },
  muted: { color: C.textMuted, textAlign: 'center', fontSize: 15 },
  btn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});