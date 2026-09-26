const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");
const { serverError } = require("../serverError");
const { isBlocked } = require("../isBlocked");

const router = express.Router();

// Sends a message in a conversation. Only the two participants (buyer or
// seller) may post, and a buyer who already sent the intro can't send more
// until the seller has replied (conv.unlocked) - mirrors the "waiting for
// response" state the chat screen already shows in the UI.
router.post("/", requireAuth, async (req, res) => {
  const { conversationId, body } = req.body || {};
  const trimmed = (body || "").trim();
  if (!conversationId || !trimmed) {
    return res.status(400).json({ error: "Missing conversationId or body" });
  }

  const { data: conv, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("id, buyer_id, seller_id, intro_sent, unlocked")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError) return serverError(res, convError, "messages.send.conversation");
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const isBuyer = req.user.id === conv.buyer_id;
  const isSeller = req.user.id === conv.seller_id;
  if (!isBuyer && !isSeller) {
    return res.status(403).json({ error: "Not part of this conversation" });
  }
  if (isBuyer && conv.intro_sent && !conv.unlocked) {
    return res.status(403).json({ error: "Waiting for the seller to reply" });
  }

  const otherId = isBuyer ? conv.seller_id : conv.buyer_id;
  try {
    if (await isBlocked(req.user.id, otherId)) {
      return res.status(403).json({ error: "Cannot message a blocked user" });
    }
  } catch (err) {
    return serverError(res, err, "messages.send.blockCheck");
  }

  const { error } = await supabaseAdmin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: req.user.id,
    body: trimmed,
  });

  if (error) return serverError(res, error, "messages.send");
  res.json({ ok: true });
});

// Edits a message's body - only the original sender can edit their own
// message, checked server-side rather than trusting the client.
router.patch("/:id", requireAuth, async (req, res) => {
  const { body } = req.body || {};
  const trimmed = (body || "").trim();
  if (!trimmed) return res.status(400).json({ error: "Missing body" });

  const { data: message, error: msgError } = await supabaseAdmin
    .from("messages")
    .select("id, sender_id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (msgError) return serverError(res, msgError, "messages.edit.lookup");
  if (!message) return res.status(404).json({ error: "Message not found" });
  if (message.sender_id !== req.user.id) {
    return res.status(403).json({ error: "Not your message" });
  }

  const { error } = await supabaseAdmin
    .from("messages")
    .update({ body: trimmed })
    .eq("id", req.params.id);

  if (error) return serverError(res, error, "messages.edit");
  res.json({ ok: true });
});

module.exports = router;
