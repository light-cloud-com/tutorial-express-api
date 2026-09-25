import express from "express";

// Light Cloud tells the app which port to listen on through PORT.
// 8080 is the fallback for running it on your own machine.
const PORT = Number(process.env.PORT) || 8080;

// Settings come from environment variables, so the same code runs
// locally and in production with different values.
const GREETING = process.env.GREETING || "Hello";

// One JSON object per line. The Logs tab reads "severity" for the level.
function log(severity, message, fields = {}) {
  console.log(JSON.stringify({ severity, message, ...fields }));
}

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    const severity = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARNING" : "INFO";
    log(severity, "request", { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - started });
  });
  next();
});

app.get("/", (req, res) => {
  res.json({ message: `${GREETING} from Express`, node: process.version });
});

app.get("/hello/:name", (req, res) => {
  res.json({ message: `${GREETING}, ${req.params.name}!` });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  log("ERROR", err.message, { path: req.path });
  res.status(500).json({ error: "Something went wrong" });
});

const server = app.listen(PORT, () => {
  log("INFO", `listening on port ${PORT}`);
});

// Light Cloud stops old instances with SIGTERM after a new version is live.
// Finish the requests in flight, then exit.
process.on("SIGTERM", () => {
  log("INFO", "SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});
