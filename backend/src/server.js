const express = require("express");
const cors = require("cors");
const jimmyRouter = require("./routes/jimmy");
const contactRouter = require("./routes/contact");
const listingsRouter = require("./routes/listings");
const messagesRouter = require("./routes/messages");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/jimmy", jimmyRouter);
app.use("/api/contact", contactRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/messages", messagesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Backend listening on port " + PORT));
