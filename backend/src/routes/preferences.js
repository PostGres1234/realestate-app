const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");
const { serverError } = require("../serverError");

const router = express.Router();

// Upserts the caller's own search preferences. user_id always comes from
// the verified token, never the request body - a client can never write
// another user's preferences, even by tampering with the request.
// Returns n as a number, or null for null/undefined/empty string. Throws a
// descriptive error for anything else so a bad type never reaches the DB.
function numOrNull(n, field) {
  if (n === null || n === undefined || n === "") return null;
  const parsed = Number(n);
  if (Number.isNaN(parsed)) throw new Error(`Invalid ${field}`);
  return parsed;
}

router.post("/", requireAuth, async (req, res) => {
  const {
    listingType, city, propertyType,
    minPrice, maxPrice, minBedrooms, maxBedrooms, minBaths, maxBaths,
    hasBalcony, hasShelter, hasParking, hasElevator, hasYard, notify,
  } = req.body || {};

  let numericFields;
  try {
    numericFields = {
      min_price: numOrNull(minPrice, "minPrice"),
      max_price: numOrNull(maxPrice, "maxPrice"),
      min_bedrooms: numOrNull(minBedrooms, "minBedrooms"),
      max_bedrooms: numOrNull(maxBedrooms, "maxBedrooms"),
      min_baths: numOrNull(minBaths, "minBaths"),
      max_baths: numOrNull(maxBaths, "maxBaths"),
    };
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const { error } = await supabaseAdmin.from("preferences").upsert({
    user_id: req.user.id,
    listing_type: listingType,
    city: city ?? null,
    property_type: propertyType ?? null,
    ...numericFields,
    has_balcony: !!hasBalcony,
    has_shelter: !!hasShelter,
    has_parking: !!hasParking,
    has_elevator: !!hasElevator,
    has_yard: !!hasYard,
    notify,
    updated_at: new Date().toISOString(),
  });

  if (error) return serverError(res, error, "preferences.save");
  res.json({ ok: true });
});

module.exports = router;
