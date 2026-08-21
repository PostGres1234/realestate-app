import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { C } from '../lib/theme';

export default function LocationInput({
  value,
  onChangeText,
  placeholder,
  kind,
  parentCity,
  style,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return; }

    const term = (value ?? '').trim();
    if (term.length < 1) { setSuggestions([]); setOpen(false); return; }

    const timer = setTimeout(async () => {
      let q = supabase
        .from('locations')
        .select('id, name, parent_city')
        .ilike('name', term + '%')
        .limit(8);

      if (kind) q = q.eq('kind', kind);
      if (parentCity) q = q.eq('parent_city', parentCity);

      const { data, error } = await q;
      if (error) { console.log('loc error', error.message); return; }

      setSuggestions(data ?? []);
      setOpen((data ?? []).length > 0);
    }, 180);

    return () => clearTimeout(timer);
  }, [value, kind, parentCity]);

  function choose(name) {
    skipNext.current = true;
    onChangeText(name);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <View style={style}>
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor="#A9B0BF"
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
      />

      {open ? (
        <View style={s.dropdown}>
          {suggestions.map((item) => (
            <Pressable key={item.id} style={s.row} onPress={() => choose(item.name)}>
              <Ionicons name="location-outline" size={15} color={C.textMuted} />
              <Text style={s.rowText}>{item.name}</Text>
              {item.parent_city ? (
                <Text style={s.rowSub}>{item.parent_city}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  dropdown: { borderWidth: 1, borderColor: C.border, borderRadius: 14, backgroundColor: C.page, marginTop: 6, overflow: 'hidden' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  rowText: { fontSize: 14, color: C.text, flex: 1, textAlign: 'right' },
  rowSub: { fontSize: 11, color: C.textMuted },
});