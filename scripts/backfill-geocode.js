#!/usr/bin/env node

/**
 * One-time maintenance script: finds properties with missing latitude/longitude
 * and geocodes them via Nominatim, one request per second to respect its usage
 * policy (bulk/rapid requests get silently rejected, which is how 101 of 109
 * properties ended up with no coordinates in the first place).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-geocode.js
 *
 * Get both values from Supabase Dashboard > Project Settings > API.
 * The service role key bypasses RLS - never commit it, only pass it as an env var.
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const DELAY_MS = 1100; // Nominatim allows ~1 request/second

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode({ address, city, neighborhood }) {
  const parts = [address, neighborhood, city, "Israel"].filter(Boolean);
  const query = parts.join(", ");

  const url = NOMINATIM +
    "?format=json&limit=1&countrycodes=il&accept-language=he&q=" +
    encodeURIComponent(query);

  const res = await fetch(url, {
    headers: { "User-Agent": "realestate-app-backfill/1.0 (contact@example.com)" },
  });
  const data = await res.json();

  if (Array.isArray(data) && data.length) {
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  }
  return null;
}

async function main() {
  const { data: rows, error } = await supabase
    .from("properties")
    .select("id, address, city, neighborhood")
    .is("latitude", null);

  if (error) {
    console.error("Failed to fetch properties:", error.message);
    process.exit(1);
  }

  console.log("Found " + rows.length + " properties missing coordinates.");

  let fixed = 0;
  let stillMissing = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write("[" + (i + 1) + "/" + rows.length + "] " + row.city + " ");

    let geo = await geocode(row);

    // Fall back to city-only if the full address didn't resolve.
    if (!geo && row.city) {
      await sleep(DELAY_MS);
      geo = await geocode({ city: row.city });
    }

    if (geo) {
      const { error: updErr } = await supabase
        .from("properties")
        .update({ latitude: geo.latitude, longitude: geo.longitude })
        .eq("id", row.id);

      if (updErr) {
        console.log("-> update failed: " + updErr.message);
      } else {
        console.log("-> " + geo.latitude.toFixed(4) + "," + geo.longitude.toFixed(4));
        fixed++;
      }
    } else {
      console.log("-> not found");
      stillMissing++;
    }

    await sleep(DELAY_MS);
  }

  console.log("\nDone. Fixed: " + fixed + ", still missing: " + stillMissing);
}

main();
