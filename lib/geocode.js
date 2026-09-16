import { log } from './logger';
import { CITY_COORDS } from './cityCoords';

const BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'realestate-app/1.0';
const MIN_GAP_MS = 1100; // Nominatim's usage policy caps free use at ~1 req/sec

let lastCallAt = 0;
let queue = Promise.resolve();

function throttledFetch(url) {
  queue = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_GAP_MS - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    return fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  });
  return queue;
}

async function safeJson(res, scope) {
  if (!res.ok) {
    log.warn(scope, 'HTTP ' + res.status);
    return null;
  }
  try {
    return await res.json();
  } catch (err) {
    log.warn(scope, String(err));
    return null;
  }
}

export async function geocodeAddress({ address, city, neighborhood }) {
  const parts = [address, neighborhood, city, 'Israel'].filter(Boolean);
  const query = parts.join(', ');

  const url = BASE
    + '?format=json&limit=1&countrycodes=il&accept-language=he'
    + '&q=' + encodeURIComponent(query);

  try {
    const res = await throttledFetch(url);
    const data = await safeJson(res, 'geocode.fail');

    if (!Array.isArray(data) || !data.length) {
      if (city) return geocodeCity(city);
      return null;
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      precise: true,
    };
  } catch (err) {
    log.warn('geocode.fail', String(err));
    if (city) return geocodeCity(city);
    return null;
  }
}

async function geocodeCity(city) {
  const url = BASE
    + '?format=json&limit=1&countrycodes=il&accept-language=he'
    + '&q=' + encodeURIComponent(city + ', Israel');

  try {
    const res = await throttledFetch(url);
    const data = await safeJson(res, 'geocode.cityFail');
    if (Array.isArray(data) && data.length) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        precise: false,
      };
    }
  } catch (err) {
    log.warn('geocode.cityFail', String(err));
  }

  const fallback = CITY_COORDS[city.trim()];
  if (fallback) {
    return { latitude: fallback[0], longitude: fallback[1], precise: false };
  }
  return null;
}