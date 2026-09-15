import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../lib/theme';

const T = {
  title: 'אמצעי תשלום',
  subtitle: 'בחרו את אמצעי התשלום המועדף עליכם להמשך השימוש באפליקציה',
  cardholderLabel: 'שם בעל הכרטיס',
  cardholderPlaceholder: 'כפי שמופיע על הכרטיס',
  numberLabel: 'מספר כרטיס',
  numberPlaceholder: '0000 0000 0000 0000',
  expiryLabel: 'תוקף',
  expiryPlaceholder: 'MM/YY',
  cvvLabel: 'CVV',
  cvvPlaceholder: '123',
  externalHint: 'החיבור לאמצעי זה יופעל בהמשך.',
  submit: 'המשך',
  checkTitle: 'בדקו את הפרטים',
  needMethod: 'יש לבחור אמצעי תשלום.',
  needCardName: 'יש למלא שם בעל הכרטיס.',
  needCardNumber: 'מספר הכרטיס אינו תקין.',
  needExpiry: 'תוקף הכרטיס אינו תקין.',
  needCvv: 'קוד CVV אינו תקין.',
};

const METHODS = [
  { key: 'card', label: 'כרטיס אשראי / דביט', icon: 'card-outline' },
  { key: 'apple_pay', label: 'Apple Pay', icon: 'logo-apple' },
  { key: 'google_pay', label: 'Google Pay', icon: 'logo-google' },
  { key: 'paypal', label: 'PayPal', icon: 'logo-paypal' },
  { key: 'bit', label: 'Bit', icon: 'phone-portrait-outline' },
  { key: 'bank_transfer', label: 'העברה בנקאית', icon: 'business-outline' },
];

function formatCardNumber(v) {
  const digits = v.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(v) {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2);
}

export default function Payment() {
  const [method, setMethod] = useState('card');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const scrollRef = useRef(null);

  function scrollToBottom() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }

  function submit() {
    if (!method) return Alert.alert(T.checkTitle, T.needMethod);

    if (method === 'card') {
      if (!cardName.trim()) return Alert.alert(T.checkTitle, T.needCardName);
      if (cardNumber.replace(/\D/g, '').length < 16) {
        return Alert.alert(T.checkTitle, T.needCardNumber);
      }
      if (!/^\d{2}\/\d{2}$/.test(expiry)) return Alert.alert(T.checkTitle, T.needExpiry);
      if (cvv.length < 3) return Alert.alert(T.checkTitle, T.needCvv);
    }

    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={s.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingTop: 70, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={s.title}>{T.title}</Text>
      <Text style={s.subtitle}>{T.subtitle}</Text>

      <View style={s.methods}>
        {METHODS.map((m) => {
          const on = method === m.key;
          return (
            <Pressable
              key={m.key}
              style={[s.method, on && s.methodOn]}
              onPress={() => setMethod(m.key)}
            >
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? C.primary : C.textMuted} />
              <Text style={[s.methodText, on && s.methodTextOn]}>{m.label}</Text>
              <Ionicons name={m.icon} size={22} color={on ? C.primary : C.textSecondary} />
            </Pressable>
          );
        })}
      </View>

      {method === 'card' ? (
        <View style={s.card}>
          <View style={s.field}>
            <Text style={s.label}>{T.cardholderLabel}</Text>
            <TextInput
              style={s.input}
              placeholder={T.cardholderPlaceholder}
              placeholderTextColor="#A9B0BF"
              value={cardName}
              onChangeText={setCardName}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>{T.numberLabel}</Text>
            <TextInput
              style={s.input}
              placeholder={T.numberPlaceholder}
              placeholderTextColor="#A9B0BF"
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={(v) => setCardNumber(formatCardNumber(v))}
              maxLength={19}
            />
          </View>

          <View style={s.row}>
            <View style={[s.field, s.rowField]}>
              <Text style={s.label}>{T.expiryLabel}</Text>
              <TextInput
                style={s.input}
                placeholder={T.expiryPlaceholder}
                placeholderTextColor="#A9B0BF"
                keyboardType="number-pad"
                value={expiry}
                onChangeText={(v) => setExpiry(formatExpiry(v))}
                onFocus={scrollToBottom}
                maxLength={5}
              />
            </View>
            <View style={[s.field, s.rowField]}>
              <Text style={s.label}>{T.cvvLabel}</Text>
              <TextInput
                style={s.input}
                placeholder={T.cvvPlaceholder}
                placeholderTextColor="#A9B0BF"
                keyboardType="number-pad"
                secureTextEntry
                value={cvv}
                onChangeText={(v) => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                onFocus={scrollToBottom}
                maxLength={4}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={s.hintBox}>
          <Ionicons name="information-circle-outline" size={16} color={C.textMuted} />
          <Text style={s.hintText}>{T.externalHint}</Text>
        </View>
      )}

      <Pressable style={s.btn} onPress={submit}>
        <Text style={s.btnText}>{T.submit}</Text>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  title: { fontSize: 26, fontWeight: '700', color: C.text, textAlign: 'right' },
  subtitle: { fontSize: 13, color: C.textMuted, textAlign: 'right', marginTop: 6, marginBottom: 22, lineHeight: 19 },
  methods: { gap: 10, marginBottom: 8 },
  method: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  methodOn: { borderColor: C.primary, backgroundColor: C.primaryTint },
  methodText: { flex: 1, fontSize: 14, color: C.textSecondary, textAlign: 'right', fontWeight: '500' },
  methodTextOn: { color: C.text, fontWeight: '700' },
  card: { marginTop: 18 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row-reverse', gap: 10 },
  rowField: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, textAlign: 'right', color: C.text },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  hintBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 4 },
  hintText: { fontSize: 12, color: C.textMuted, textAlign: 'right', flex: 1, lineHeight: 18 },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 26 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
