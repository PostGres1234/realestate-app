// Logs the real error server-side (visible in Render's logs) and sends a
// generic message to the client - the raw Postgres/Supabase error text can
// contain table/column/constraint names we don't want to expose.
function serverError(res, error, context) {
  console.log(context + " error:", error.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

module.exports = { serverError };
