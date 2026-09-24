const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jimmyRouter = require("./routes/jimmy");
const contactRouter = require("./routes/contact");
const listingsRouter = require("./routes/listings");
const messagesRouter = require("./routes/messages");
const callsRouter = require("./routes/calls");
const preferencesRouter = require("./routes/preferences");
const favoritesRouter = require("./routes/favorites");
const recentRouter = require("./routes/recent");
const reportsRouter = require("./routes/reports");
const profileRouter = require("./routes/profile");

const app = express();

app.use(helmet());

// The mobile app sends no Origin header at all (CORS is a browser-only
// mechanism), so this only ever matters for the Vercel web build - allow
// that domain (and any Vercel preview deployment) and nothing else.
const ALLOWED_ORIGINS = ["https://realestate-app-seven-chi.vercel.app"];
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
}));

app.use(express.json({ limit: "2mb" }));

// Global cap protects every route from scripted abuse; Jimmy gets a much
// tighter cap on top of that since each message costs real money (Claude API).
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
}));

const jimmyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/jimmy", jimmyLimiter, jimmyRouter);
app.use("/api/contact", contactRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/calls", callsRouter);
app.use("/api/preferences", preferencesRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/recent", recentRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/profile", profileRouter);

// Catches the CORS rejection above (and any other error that reaches here)
// so a blocked cross-origin request gets a clean JSON response instead of
// Express's default HTML error page.
app.use((err, _req, res, _next) => {
  console.log("unhandled error:", err.message);
  res.status(403).json({ error: "Not allowed" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Backend listening on port " + PORT));
