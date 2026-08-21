import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { C } from '../lib/theme';

export default function MultiCityInput({ cities, setCities, placeholder }) {
  const [term, setTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = term.trim();
    if (t.length < 1) { setSuggestions([]); setOpen(false); return; }

    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, kind, parent_city')
        .ilike('name', t + '%')
        .limit(8);

      if (error) { console.log('loc error', error.message); return; }
      const filtered = (data ?? []).filter((x) => !cities.includes(x.name));
      setSuggestions(filtered);
      setOpen(filtered.length > 0);
    }, 180);

    return () => clearTimeout(timer);
  }, [term, cities]);

  function add(name) {
    setCities([...cities, name]);
    setTerm('');
    setOpen(false);
    setSuggestions([]);
  }

  function remove(name) {
    setCities(cities.filter((c) => c !== name));
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s.box}>
        <Ionicons name="search" size={17} color={C.textMuted} />
        <TextInput
          style={s.input}
          placeholder={cities.length ? '' : placeholder}
          placeholderTextColor="#A9B0BF"
          value={term}
          onChangeText={setTerm}
          autoCorrect={false}
        />
      </View>

      {cities.length ? (
        <View style={s.chips}>
          {cities.map((c) => (
            <Pressable key={c} style={s.chip} onPress={() => remove(c)}>
              <Text style={s.chipText}>{c}</Text>
              <Ionicons name="close" size={14} color={C.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {open ? (
        <View style={s.dropdown}>
          {suggestions.map((item) => (
            <Pressable key={item.id} style={s.row} onPress={() => add(item.name)}>
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
  box: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 14, color: C.text, textAlign: 'right', padding: 0 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: C.primaryTint, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  dropdown: { borderWidth: 1, borderColor: C.border, borderRadius: 14, backgroundColor: C.page, marginTop: 6, overflow: 'hidden' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  rowText: { fontSize: 14, color: C.text, flex: 1, textAlign: 'right' },
  rowSub: { fontSize: 11, color: C.textMuted },
});