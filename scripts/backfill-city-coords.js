#!/usr/bin/env node

// One-time fix: Nominatim (the free geocoding service) is blocking bulk
// requests, so instead of live geocoding, this fills in city-center
// coordinates directly for properties that have none yet. Less precise
// than a full address geocode, but good enough to place a pin on the map.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}

const CITY_COORDS = {
  "אשדוד": [31.8014, 34.6435],
  "באר שבע": [31.2530, 34.7915],
  "הרצליה": [32.1624, 34.8447],
  "חדרה": [32.4340, 34.9196],
  "חיפה": [32.7940, 34.9896],
  "טבריה": [32.7922, 35.5312],
  "ירושלים": [31.7683, 35.2137],
  "כפר סבא": [32.1858, 34.9077],
  "נהריה": [33.0072, 35.0925],
  "נצרת": [32.6996, 35.3035],
  "נתניה": [32.3215, 34.8532],
  "עכו": [32.9281, 35.0819],
  "קריית ים": [32.8497, 35.0692],
  "ראשון לציון": [31.9730, 34.7925],
  "רמת גן": [32.0684, 34.8248],
  "רעננה": [32.1848, 34.8713],
  "תל אביב": [32.0853, 34.7818],
};

async function main() {
  const listUrl = SUPABASE_URL + "/rest/v1/properties?latitude=is.null&select=id,city";
  const res = await fetch(listUrl, {
    headers: { apikey: SERVICE_KEY, authorization: "Bearer " + SERVICE_KEY },
  });
  const rows = await res.json();
  console.log("Found " + rows.length + " properties missing coordinates.");

  let fixed = 0;
  let unknownCity = 0;

  for (const row of rows) {
    const coords = CITY_COORDS[row.city];
    if (!coords) {
      console.log("No coords known for city: " + row.city + " (id " + row.id + ")");
      unknownCity++;
      continue;
    }

    const patchUrl = SUPABASE_URL + "/rest/v1/properties?id=eq." + row.id;
    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        authorization: "Bearer " + SERVICE_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ latitude: coords[0], longitude: coords[1] }),
    });

    if (!patchRes.ok) {
      console.log("Failed to update " + row.id + ": " + patchRes.status);
      continue;
    }
    fixed++;
  }

  console.log("Done. Fixed: " + fixed + ", unknown city: " + unknownCity);
}

main();
