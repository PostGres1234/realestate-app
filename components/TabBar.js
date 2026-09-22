import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';

const T = {
  home: 'בית',
  assistant: 'ג׳ימי',
  add: 'פרסום נכס',
  messages: 'הודעות',
  profile: 'פרופיל',
  needLoginTitle: 'נדרשת התחברות',
  needLoginBody: 'כדי להמשיך יש להתחבר לחשבון.',
  loginNow: 'התחברות',
  cancel: 'ביטול',
};

export default function TabBar({ active, unread = 0 }) {
  const { user } = useAuth();
  const pathname = usePathname();

  function needLogin() {
    Alert.alert(T.needLoginTitle, T.needLoginBody, [
      { text: T.cancel, style: 'cancel' },
      { text: T.loginNow, onPress: () => router.push('/(auth)/login') },
    ]);
  }

  function go(tab) {
    if (tab.auth && !user) return needLogin();
    if (pathname === tab.path) return;

    if (tab.path === '/') {
      router.dismissAll?.();
      router.replace('/');
      return;
    }
    router.push(tab.path);
  }

  const tabs = [
    { key: 'home', icon: 'home', label: T.home, path: '/', auth: false },
    { key: 'assistant', icon: 'sparkles', label: T.assistant, path: '/assistant', auth: true },
    { key: 'add', icon: 'add-circle', label: T.add, path: '/sell/new', auth: true },
    { key: 'messages', icon: 'chatbubble', label: T.messages, path: '/messages', auth: true, badge: unread },
    { key: 'profile', icon: 'person', label: T.profile, path: user ? '/account' : '/(auth)/login', auth: false },
  ];

  return (
    <View style={s.bar}>
      {tabs.map((t) => {
        const on = active === t.key;
        const isAdd = t.key === 'add';
        return (
          <Pressable
            key={t.key}
            style={s.tab}
            onPress={() => go(t)}
            android_ripple={{ color: 'rgba(31,111,235,0.1)', borderless: true, radius: 34 }}
          >
            <View style={isAdd && s.addCircle}>
              <Ionicons
                name={on ? t.icon : (t.icon + '-outline')}
                size={isAdd ? 26 : 22}
                color={isAdd ? '#fff' : (on ? C.primary : C.textMuted)}
              />
              {t.badge > 0 ? (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{t.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[s.label, on && s.labelOn, isAdd && s.addLabel]}>{t.label}</Text>
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
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  label: { fontSize: 10, color: C.textMuted },
  labelOn: { color: C.primary, fontWeight: '700' },
  addCircle: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addLabel: { color: C.primary, fontWeight: '700' },
  badge: {
    position: 'absolute', top: -4, left: -10,
    backgroundColor: C.danger, minWidth: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});