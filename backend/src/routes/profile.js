const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");
const { serverError } = require("../serverError");

const router = express.Router();

// Updates the caller's own profile. The row to update always comes from
// the verified token (req.user.id), never the request body - a client can
// never edit someone else's name/phone/occupation.
router.patch("/", requireAuth, async (req, res) => {
  const { fullName, phone, occupation, allowCalls } = req.body || {};

  if (!fullName?.trim()) {
    return res.status(400).json({ error: "Missing full name" });
  }
  const digits = (phone || "").replace(/\D/g, "");
  if (phone?.trim() && digits.length < 9) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: fullName.trim(),
      phone: phone?.trim() || null,
      occupation: occupation?.trim() || null,
      allow_calls: !!allowCalls,
    })
    .eq("id", req.user.id);

  if (error) return serverError(res, error, "profile.save");
  res.json({ ok: true });
});

module.exports = router;
