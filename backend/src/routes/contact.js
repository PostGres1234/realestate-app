const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const buyerId = req.user.id;
  const { propertyId, body, occupation } = req.body || {};

  if (!propertyId || !body?.trim() || !occupation?.trim()) {
    return res.status(400).json({ error: "Missing propertyId, body, or occupation" });
  }

  const { data: property, error: propErr } = await supabaseAdmin
    .from("properties")
    .select("id, seller_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (propErr || !property) {
    return res.status(404).json({ error: "Property not found" });
  }

  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("property_id", propertyId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (existingErr) {
    return res.status(500).json({ error: existingErr.message });
  }
  if (existing) {
    return res.json({ conversationId: existing.id, existed: true });
  }

  const { data: conv, error: convErr } = await supabaseAdmin
    .from("conversations")
    .insert({ property_id: propertyId, buyer_id: buyerId, seller_id: property.seller_id })
    .select("id")
    .single();

  if (convErr) {
    return res.status(500).json({ error: convErr.message });
  }

  const { error: msgErr } = await supabaseAdmin.from("messages").insert({
    conversation_id: conv.id,
    sender_id: buyerId,
    body,
  });
  if (msgErr) console.log("contact: message insert failed", msgErr.message);

  const { error: introErr } = await supabaseAdmin
    .from("conversations")
    .update({ intro_sent: true })
    .eq("id", conv.id);
  if (introErr) console.log("contact: intro_sent update failed", introErr.message);

  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .update({ occupation: occupation.trim() })
    .eq("id", buyerId);
  if (profErr) console.log("contact: profile update failed", profErr.message);

  res.json({ conversationId: conv.id, existed: false });
});

module.exports = router;
