const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");
const { serverError } = require("../serverError");

const router = express.Router();

const VALID_REASONS = ["fake", "agent", "spam", "offensive", "scam", "other"];

// Files a report and optionally blocks the target user. reporter_id/
// blocker_id always come from the verified token, never the request body.
router.post("/", requireAuth, async (req, res) => {
  const { targetUser, targetProperty, reason, details, alsoBlock } = req.body || {};

  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: "Invalid reason" });
  }

  const { error } = await supabaseAdmin.from("reports").insert({
    reporter_id: req.user.id,
    target_user: targetUser ?? null,
    target_property: targetProperty ?? null,
    reason,
    details: details?.trim() || null,
  });

  if (error) return serverError(res, error, "reports.create");

  let blocked = false;
  if (alsoBlock && targetUser) {
    const { error: blockError } = await supabaseAdmin.from("blocks").insert({
      blocker_id: req.user.id,
      blocked_id: targetUser,
    });
    if (!blockError) blocked = true;
  }

  res.json({ ok: true, blocked });
});

module.exports = router;
