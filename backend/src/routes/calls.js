const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");
const { serverError } = require("../serverError");
const { isBlocked } = require("../isBlocked");

const router = express.Router();

// Tells the seller of a conversation whether they're allowed to call the
// buyer, and if so, the buyer's contact info (name/phone/occupation) - the
// clearest piece of personal info in the app. Only the seller can ever see
// this; a buyer asking about their own conversation just gets nothing back,
// same as before rather than an error, since the chat screen calls this
// unconditionally for both sides.
router.get("/:conversationId", requireAuth, async (req, res) => {
  const { data: conv, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("id, buyer_id, seller_id, intro_sent")
    .eq("id", req.params.conversationId)
    .maybeSingle();

  if (convError) return serverError(res, convError, "calls.lookup");
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  if (conv.seller_id !== req.user.id) {
    return res.json({ callable: false, buyer: null });
  }

  try {
    if (await isBlocked(conv.seller_id, conv.buyer_id)) {
      return res.json({ callable: false, buyer: null });
    }
  } catch (err) {
    return serverError(res, err, "calls.blockCheck");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("full_name, phone, occupation, allow_calls")
    .eq("id", conv.buyer_id)
    .maybeSingle();

  if (profileError) return serverError(res, profileError, "calls.profile");

  const hasPhone = !!profile?.phone && profile.phone.trim().length >= 6;
  const callable = !!conv.intro_sent && hasPhone && profile?.allow_calls !== false;

  res.json({
    callable,
    buyer: profile
      ? { full_name: profile.full_name, phone: profile.phone, occupation: profile.occupation }
      : null,
  });
});

module.exports = router;
