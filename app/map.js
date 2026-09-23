import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet, PanResponder } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { logSupabase } from '../lib/logger';
import { api } from '../lib/api';
import { C } from '../lib/theme';
import BackBar from '../components/BackBar';

const T = {
  heading: 'מפת נכסים',
  sale: 'למכירה',
  rent: 'להשכרה',
  all: 'הכל',
  results: 'נכסים',
  loadingPlaces: 'טוען מקומות...',
  noneFound: 'לא נמצאו מקומות באזור',
  noName: 'ללא שם',
  radiusLabel: 'טווח מהבית',
  km: 'ק"מ',
  guest: 'התחברו כדי לצפות במפה',
  login: 'התחברות',
};

const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 20;
const DEFAULT_RADIUS_KM = 3;
const KM_TO_DEG = 1 / 111; // rough conversion, consistent with the rest of this screen

const THUMB_SIZE = 22;

function RadiusSlider({ value, onChange, disabled }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragValue, setDragValue] = useState(value);
  const draggingRef = useRef(false);
  const startValueRef = useRef(value);
  // PanResponder.create runs once (memoized in a ref below), so its
  // callbacks close over stale state - track the live value in a ref
  // instead of reading `dragValue` directly inside those callbacks.
  const dragValueRef = useRef(value);
  const trackWidthRef = useRef(0);
  const disabledRef = useRef(disabled);
  // changeRadius is a fresh closure every MapScreen render (it reads
  // current active/points/radiusKm) - forward through a ref so the
  // once-created PanResponder always calls the latest version.
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    if (!draggingRef.current) {
      setDragValue(value);
      dragValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  function updateDrag(v) {
    dragValueRef.current = v;
    setDragValue(v);
  }

  // PanResponder must be created once and reused; ref-forwarding (not
  // stale reads) keeps its callbacks in sync with the latest state.
  const pan = useRef(
    // eslint-disable-next-line react-hooks/refs
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: () => {
        draggingRef.current = true;
        startValueRef.current = dragValueRef.current;
      },
      onPanResponderMove: (_e, gesture) => {
        if (!trackWidthRef.current) return;
        const startRatio = (startValueRef.current - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM);
        const deltaRatio = gesture.dx / trackWidthRef.current;
        const ratio = Math.max(0, Math.min(1, startRatio + deltaRatio));
        updateDrag(Math.round(MIN_RADIUS_KM + ratio * (MAX_RADIUS_KM - MIN_RADIUS_KM)));
      },
      onPanResponderRelease: () => {
        draggingRef.current = false;
        onChangeRef.current(dragValueRef.current);
      },
    })
  ).current;

  const ratio = (dragValue - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM);
  const thumbCenter = ratio * trackWidth;

  return (
    <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
      <Text style={s.radiusValue}>{dragValue} {T.km}</Text>
      <View
        style={s.sliderTrack}
        onLayout={(e) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
          setTrackWidth(e.nativeEvent.layout.width);
        }}
        // eslint-disable-next-line react-hooks/refs -- see note above
        {...pan.panHandlers}
      >
        <View style={s.sliderLine} />
        <View style={[s.sliderFill, { width: thumbCenter }]} />
        <View
          style={[
            s.sliderThumb,
            { left: Math.max(0, Math.min(trackWidth - THUMB_SIZE, thumbCenter - THUMB_SIZE / 2)) },
          ]}
        />
      </View>
    </View>
  );
}

const LAYERS = [
  {
    key: 'school', label: 'חינוך', icon: 'school-outline',
    color: '#F5A623', emoji: '\uD83C\uDFEB',
    filter: 'nwr["amenity"~"^(school|kindergarten|college|university)$"]["name"]',
  },
  {
    key: 'health', label: 'בריאות', icon: 'medkit-outline',
    color: '#E5484D', emoji: '\uD83C\uDFE5',
    filter: 'nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]["name"]',
  },
  {
    key: 'gym', label: 'ספורט', icon: 'barbell-outline',
    color: '#1D9E75', emoji: '\uD83D\uDCAA',
    filter: 'nwr["leisure"~"^(fitness_centre|sports_centre|sports_hall|swimming_pool|pitch)$"]["name"]',
  },
  {
    key: 'shop', label: 'קניות', icon: 'cart-outline',
    color: '#8B5CF6', emoji: '\uD83D\uDED2',
    filter: 'nwr["shop"~"^(mall|supermarket|department_store|convenience|bakery)$"]["name"]',
  },
  {
    key: 'transit', label: 'תחבורה', icon: 'bus-outline',
    color: '#0EA5E9', emoji: '\uD83D\uDE8C',
    filter: 'nwr["public_transport"~"^(station|stop_position)$"]["name"]',
  },
  {
    key: 'park', label: 'פארקים', icon: 'leaf-outline',
    color: '#16A34A', emoji: '\uD83C\uDF33',
    filter: 'nwr["leisure"~"^(park|playground|garden)$"]["name"]',
  },
  {
    key: 'food', label: 'מסעדות', icon: 'restaurant-outline',
    color: '#F97316', emoji: '\uD83C\uDF7D',
    filter: 'nwr["amenity"~"^(restaurant|cafe|fast_food)$"]["name"]',
  },
  {
    key: 'worship', label: 'בתי תפילה', icon: 'moon-outline',
    color: '#0891B2', emoji: '\uD83D\uDD4C',
    filter: 'nwr["amenity"="place_of_worship"]["name"]',
  },
  {
    key: 'bank', label: 'בנקים', icon: 'card-outline',
    color: '#4F46E5', emoji: '\uD83C\uDFE7',
    filter: 'nwr["amenity"~"^(bank|atm|post_office)$"]["name"]',
  },
  {
    key: 'center', label: 'מרכז העיר', icon: 'business-outline',
    color: '#64748B', emoji: '\uD83C\uDFDB',
    filter: 'node["place"~"^(city|town)$"]["name"]',
  },
];

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

function buildHtml(points, places) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0;
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif; }

  .home-pin {
    background: linear-gradient(135deg, #1f6feb, #1652B8);
    width: 36px; height: 36px;
    border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
    border: 3px solid #fff; box-shadow: 0 4px 11px rgba(31,111,235,0.45);
    display: flex; align-items: center; justify-content: center;
  }
  .home-pin span { display: block; transform: rotate(45deg); font-size: 16px; }

  .poi-wrap { display: flex; flex-direction: column; align-items: center; }
  .poi-pin {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2.5px solid #fff; box-shadow: 0 3px 7px rgba(0,0,0,0.28);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
  }
  .poi-label {
    margin-top: 3px; background: rgba(255,255,255,0.96);
    border-radius: 6px; padding: 2px 6px;
    font-size: 10px; font-weight: 700; color: #1A1D26;
    white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    max-width: 110px; overflow: hidden; text-overflow: ellipsis;
    direction: rtl;
  }

  .p-price { font-size: 18px; font-weight: 800; color: #1f6feb; }
  .p-city { font-size: 13px; color: #1A1D26; margin-top: 3px; font-weight: 600; }
  .p-meta { font-size: 12px; color: #8A92A6; margin-top: 3px; }
  .p-btn {
    display: block; margin-top: 10px; background: #1f6feb; color: #fff;
    text-align: center; padding: 8px; border-radius: 10px;
    font-size: 13px; font-weight: 700; text-decoration: none;
  }
  .poi-name { font-size: 14px; font-weight: 700; color: #1A1D26; }
  .poi-kind { font-size: 11px; color: #8A92A6; margin-top: 3px; }
  .info-box { direction: rtl; text-align: right; min-width: 140px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map, infoWindow;

  function PinOverlay(position, html, anchorX, anchorY, onClick) {
    this.position = position;
    this.html = html;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.onClick = onClick;
    this.div = null;
    this.setMap(map);
  }
  PinOverlay.prototype = Object.create(google.maps.OverlayView.prototype);
  PinOverlay.prototype.onAdd = function () {
    var div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.cursor = 'pointer';
    div.innerHTML = this.html;
    var self = this;
    div.addEventListener('click', function (e) {
      e.stopPropagation();
      self.onClick();
    });
    this.div = div;
    this.getPanes().overlayMouseTarget.appendChild(div);
  };
  PinOverlay.prototype.draw = function () {
    if (!this.div) return;
    var proj = this.getProjection();
    if (!proj) return;
    var pos = proj.fromLatLngToDivPixel(this.position);
    this.div.style.left = (pos.x - this.anchorX) + 'px';
    this.div.style.top = (pos.y - this.anchorY) + 'px';
  };
  PinOverlay.prototype.onRemove = function () {
    if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
    this.div = null;
  };

  function open_(id) { window.ReactNativeWebView.postMessage(id); }

  function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 31.7, lng: 35.0 },
      zoom: 8,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
    });
    infoWindow = new google.maps.InfoWindow();

    var points = ${JSON.stringify(points)};
    var places = ${JSON.stringify(places)};
    var bounds = new google.maps.LatLngBounds();
    var hasPoints = false;

    points.forEach(function (p) {
      var pos = new google.maps.LatLng(p.lat, p.lng);
      bounds.extend(pos);
      hasPoints = true;

      new PinOverlay(
        pos,
        '<div class="home-pin"><span>&#127968;</span></div>',
        18, 36,
        function () {
          infoWindow.setContent(
            '<div class="info-box">' +
            '<div class="p-price">' + p.price + '</div>' +
            '<div class="p-city">' + p.city + '</div>' +
            '<div class="p-meta">' + p.meta + '</div>' +
            '<a class="p-btn" href="#" onclick="open_(\\'' + p.id + '\\');return false;">צפייה בנכס</a>' +
            '</div>'
          );
          infoWindow.setPosition(pos);
          infoWindow.open(map);
        }
      );
    });

    places.forEach(function (q) {
      var pos = new google.maps.LatLng(q.lat, q.lng);

      new PinOverlay(
        pos,
        '<div class="poi-wrap">' +
          '<div class="poi-pin" style="background:' + q.color + '">' + q.emoji + '</div>' +
          '<div class="poi-label">' + q.name + '</div>' +
          '</div>',
        55, 14,
        function () {
          infoWindow.setContent(
            '<div class="info-box">' +
            '<div class="poi-name">' + q.name + '</div>' +
            '<div class="poi-kind">' + q.label + '</div>' +
            '</div>'
          );
          infoWindow.setPosition(pos);
          infoWindow.open(map);
        }
      );
    });

    if (hasPoints) map.fitBounds(bounds, 60);
  }
</script>
<script async defer
  src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=initMap">
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const { user } = useAuth();
  const [points, setPoints] = useState([]);
  const [places, setPlaces] = useState([]);
  const [active, setActive] = useState({});
  const [loading, setLoading] = useState(true);
  const [poiLoading, setPoiLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [mode, setMode] = useState('all');
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    let data = [];
    try {
      data = await api.get('/api/listings/map?deal=' + mode);
    } catch (err) {
      logSupabase('map.load', { message: err.message }, { mode });
    }

    const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

    setPoints((data ?? []).map((p) => ({
      id: p.id,
      lat: p.latitude,
      lng: p.longitude,
      price: money(p.price) + (p.listing_type === 'rent' ? ' לחודש' : ''),
      city: p.neighborhood ? p.city + ', ' + p.neighborhood : p.city,
      meta: (p.bedrooms ?? '-') + ' חדרים · ' + (p.area_sqm ?? '-') + ' מ"ר',
    })));
    setLoading(false);
  }, [mode, user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function bboxFrom(pts) {
    if (!pts.length) return '29.4,34.2,33.4,35.9';

    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);

    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);

    const MIN_SPAN = 0.08;
    if (maxLat - minLat < MIN_SPAN) {
      const mid = (maxLat + minLat) / 2;
      minLat = mid - MIN_SPAN / 2;
      maxLat = mid + MIN_SPAN / 2;
    }
    if (maxLng - minLng < MIN_SPAN) {
      const mid = (maxLng + minLng) / 2;
      minLng = mid - MIN_SPAN / 2;
      maxLng = mid + MIN_SPAN / 2;
    }

    const pad = 0.04;
    return [minLat - pad, minLng - pad, maxLat + pad, maxLng + pad].join(',');
  }

 async function fetchOverpass(query) {
    const servers = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.osm.ch/api/interpreter',
    ];

    const attempts = servers.map((url) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      }).then(async (res) => {
        if (!res.ok) throw new Error('status ' + res.status);
        const json = await res.json();
        if (!json.elements?.length) throw new Error('empty');
        return json;
      })
    );

    return Promise.any(attempts);
  }

  // A single bbox spanning every listing nationwide would let one dense
  // region (e.g. Tel Aviv) exhaust the whole result quota, leaving other
  // cities (e.g. Haifa) with zero results even when matches exist there.
  // Query a small box around each listing instead, unioned together, so
  // every city with a listing gets its own guaranteed search area.
  async function fetchLayerPlaces(layer, km) {
    const half = km * KM_TO_DEG;
    const clauses = points.length
      ? points
          .map((p) => `${layer.filter}(${p.lat - half},${p.lng - half},${p.lat + half},${p.lng + half});`)
          .join('')
      : `${layer.filter}(${bboxFrom([])});`;
    const q = `[out:json][timeout:25];(${clauses});out center 300;`;

    const json = await fetchOverpass(q);
    return (json.elements ?? [])
      .map((el) => ({
        key: layer.key,
        label: layer.label,
        color: layer.color,
        emoji: layer.emoji,
        name: el.tags?.['name:he'] ?? el.tags?.name ?? T.noName,
        lat: el.lat ?? el.center?.lat,
        lng: el.lon ?? el.center?.lon,
      }))
      .filter((x) => x.lat && x.lng);
  }

  async function toggleLayer(layer) {
    const on = !!active[layer.key];

    if (on) {
      setActive((a) => ({ ...a, [layer.key]: false }));
      setPlaces((p) => p.filter((x) => x.key !== layer.key));
      return;
    }

    setActive((a) => ({ ...a, [layer.key]: true }));
    setPoiLoading(true);
    setToast(T.loadingPlaces);

    try {
      const found = await fetchLayerPlaces(layer, radiusKm);
      setPlaces((p) => [...p.filter((x) => x.key !== layer.key), ...found]);
      setToast('');
    } catch (err) {
      logSupabase('map.overpass', { message: String(err) }, { layer: layer.key });
      setActive((a) => ({ ...a, [layer.key]: false }));
      setToast(T.noneFound);
      setTimeout(() => setToast(''), 2500);
    }

    setPoiLoading(false);
  }

  async function changeRadius(km) {
    if (km === radiusKm) return;
    setRadiusKm(km);

    const activeLayers = LAYERS.filter((l) => active[l.key]);
    if (!activeLayers.length) return;

    setPoiLoading(true);
    setToast(T.loadingPlaces);

    try {
      const results = await Promise.all(activeLayers.map((l) => fetchLayerPlaces(l, km)));
      const activeKeys = new Set(activeLayers.map((l) => l.key));
      setPlaces((p) => [...p.filter((x) => !activeKeys.has(x.key)), ...results.flat()]);
      setToast('');
    } catch (err) {
      logSupabase('map.overpass', { message: String(err) }, { radiusKm: km });
      setToast(T.noneFound);
      setTimeout(() => setToast(''), 2500);
    }

    setPoiLoading(false);
  }

  if (!user) {
    return (
      <View style={s.wrap}>
        <BackBar title={T.heading} />
        <View style={s.center}>
          <Ionicons name="map-outline" size={54} color={C.textMuted} />
          <Text style={s.muted}>{T.guest}</Text>
          <Pressable style={s.btn} onPress={() => router.push('/subscribe')}>
            <Text style={s.btnText}>{T.login}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <BackBar
        title={T.heading}
        right={<Text style={s.count}>{points.length + ' ' + T.results}</Text>}
      />

      <View style={s.controls}>
        <View style={s.segment}>
          <Pressable
            style={[s.segBtn, mode === 'all' && s.segOn]}
            onPress={() => setMode('all')}
          >
            <Text style={mode === 'all' ? s.segTextOn : s.segText}>{T.all}</Text>
          </Pressable>
          <Pressable
            style={[s.segBtn, mode === 'sale' && s.segOn]}
            onPress={() => setMode('sale')}
          >
            <Text style={mode === 'sale' ? s.segTextOn : s.segText}>{T.sale}</Text>
          </Pressable>
          <Pressable
            style={[s.segBtn, mode === 'rent' && s.segOn]}
            onPress={() => setMode('rent')}
          >
            <Text style={mode === 'rent' ? s.segTextOn : s.segText}>{T.rent}</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
        >
          {LAYERS.map((l) => {
            const on = !!active[l.key];
            return (
              <Pressable
                key={l.key}
                style={[s.pill, on && { backgroundColor: l.color, borderColor: l.color }]}
                onPress={() => { if (!loading) toggleLayer(l); }}
              >
                <Ionicons name={l.icon} size={17} color={on ? '#fff' : l.color} />
                <Text style={[s.pillText, on && s.pillTextOn]}>{l.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.radiusRow}>
          <Text style={s.radiusLabel}>{T.radiusLabel}</Text>
          <RadiusSlider value={radiusKm} onChange={changeRadius} disabled={loading} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <WebView
            key={mode + '-' + points.length + '-' + places.length}
            originWhitelist={['*']}
            source={{ html: buildHtml(points, places) }}
            style={{ flex: 1 }}
            onMessage={(e) => {
              const id = e.nativeEvent.data;
              if (id) router.push('/property/' + id);
            }}
          />
        )}

        {toast ? (
          <View style={s.toast}>
            {poiLoading ? <ActivityIndicator size="small" color={C.primary} /> : null}
            <Text style={s.toastText}>{toast}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  count: { fontSize: 12, color: C.textMuted },
  controls: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  segment: { flexDirection: 'row-reverse', backgroundColor: C.surface, borderRadius: 14, padding: 4, marginHorizontal: 16 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: C.primary },
  segText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  segTextOn: { color: '#fff', fontSize: 13, fontWeight: '600' },
  pills: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  pill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 7,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.page,
    borderRadius: 24, paddingHorizontal: 15, paddingVertical: 10,
  },
  pillText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  pillTextOn: { color: '#fff' },
  radiusRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  radiusLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  radiusValue: { fontSize: 12, color: C.primary, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  sliderTrack: { flex: 1, height: THUMB_SIZE, justifyContent: 'center' },
  sliderLine: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: C.border },
  sliderFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: C.primary },
  sliderThumb: {
    position: 'absolute', width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
    backgroundColor: C.primary, borderWidth: 3, borderColor: '#fff',
    shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 30 },
  muted: { color: C.textMuted, fontSize: 15, textAlign: 'center' },
  btn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  toast: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 22,
    paddingHorizontal: 18, paddingVertical: 11,
    shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  toastText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
});