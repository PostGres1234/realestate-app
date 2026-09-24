const { supabaseAdmin } = require("./supabaseAdmin");

// Below this many active listings, an average is too noisy to be worth
// showing - better to honestly say "not enough data" than mislead a seller
// with a number computed from one or two listings.
const MIN_SAMPLES = 3;

async function queryAvgPricePerSqm(city, neighborhood) {
  let query = supabaseAdmin
    .from("properties")
    .select("price, area_sqm")
    .eq("city", city)
    .eq("status", "active")
    .gt("area_sqm", 0)
    .gt("price", 0);

  if (neighborhood) query = query.eq("neighborhood", neighborhood);

  const { data, error } = await query;
  if (error || !data || data.length < MIN_SAMPLES) return null;

  const avg = data.reduce((sum, p) => sum + p.price / p.area_sqm, 0) / data.length;
  return { avgPricePerSqm: Math.round(avg), sampleSize: data.length };
}

// Computed live from the app's own active listings - a neighborhood-level
// average when there's enough data there, falling back to the city-wide
// average otherwise. Never reads from a separately-maintained table, so it's
// always in sync with what's actually listed right now.
async function getAreaPrice(city, neighborhood) {
  if (neighborhood) {
    const exact = await queryAvgPricePerSqm(city, neighborhood);
    if (exact) return exact;
  }
  return await queryAvgPricePerSqm(city, null);
}

module.exports = { getAreaPrice };
