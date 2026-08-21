import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';

const T = {
  home: 'בית',
  saved: 'שמורים',
  add: 'הוספה',
  messages: 'הודעות',
  profile: 'פרופיל',
  needLoginTitle: 'נדרשת התחברות',
  needLoginBody: 'כדי להמשיך יש להתחבר לחשבון.',
  loginNow: 'התחברות',
  cancel: 'ביטול',
};

export default function TabBar({ active, unread = 0 }) {
  const { user } = useAuth();

  function needLogin() {
    Alert.alert(T.needLoginTitle, T.needLoginBody, [
      { text: T.cancel, style: 'cancel' },
      { text: T.loginNow, onPress: () => router.push('/(auth)/login') },
    ]);
  }

  function go(tab) {
    if (tab.auth && !user) return needLogin();
    if (tab.push) router.push(tab.path);
    else router.replace(tab.path);
  }

  const tabs = [
    { key: 'home', icon: 'home', label: T.home, path: '/', auth: false },
    { key: 'saved', icon: 'heart', label: T.saved, path: '/saved', auth: true },
    { key: 'add', icon: 'add-circle', label: T.add, path: '/sell/new', auth: true, push: true },
    { key: 'messages', icon: 'chatbubble', label: T.messages, path: '/messages', auth: true, badge: unread },
    { key: 'profile', icon: 'person', label: T.profile, path: user ? '/account' : '/(auth)/login', auth: false },
  ];

  return (
    <View style={s.bar}>
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <Pressable key={t.key} style={s.tab} onPress={() => go(t)}>
            <View>
              <Ionicons
                name={on ? t.icon : (t.icon + '-outline')}
                size={22}
                color={on ? C.primary : C.textMuted}
              />
              {t.badge > 0 ? (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{t.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[s.label, on && { color: C.primary }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: C.page,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 10, color: C.textMuted },
  badge: {
    position: 'absolute', top: -4, left: -10,
    backgroundColor: C.danger, minWidth: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});