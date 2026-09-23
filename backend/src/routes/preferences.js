const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");

const router = express.Router();

// Upserts the caller's own search preferences. user_id always comes from
// the verified token, never the request body - a client can never write
// another user's preferences, even by tampering with the request.
router.post("/", requireAuth, async (req, res) => {
  const {
    listingType, city, propertyType,
    minPrice, maxPrice, minBedrooms, maxBedrooms, minBaths, maxBaths,
    hasBalcony, hasShelter, hasParking, hasElevator, hasYard, notify,
  } = req.body || {};

  const { error } = await supabaseAdmin.from("preferences").upsert({
    user_id: req.user.id,
    listing_type: listingType,
    city: city ?? null,
    property_type: propertyType ?? null,
    min_price: minPrice ?? null,
    max_price: maxPrice ?? null,
    min_bedrooms: minBedrooms ?? null,
    max_bedrooms: maxBedrooms ?? null,
    min_baths: minBaths ?? null,
    max_baths: maxBaths ?? null,
    has_balcony: !!hasBalcony,
    has_shelter: !!hasShelter,
    has_parking: !!hasParking,
    has_elevator: !!hasElevator,
    has_yard: !!hasYard,
    notify,
    updated_at: new Date().toISOString(),
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
