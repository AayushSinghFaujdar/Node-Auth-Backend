import e from "express";
import Routes from "./src/routes.js";
import dotenv from 'dotenv';
import cors from 'cors';
import os from 'os';

dotenv.config();

const app = e();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(e.json()); // This parses JSON request bodies

/* ---------------------------------------------------------------------------
 * REQUEST TRACER  --  this is your diagnostic.
 * Every request that actually reaches Node prints here with the caller's IP.
 *   phone taps Sign Up + NOTHING prints  -> packets never arrived.
 *                                           Network / Windows Firewall problem.
 *   "-->" prints but no "<--"            -> the handler is hanging. Code problem.
 * ------------------------------------------------------------------------- */
app.use((req, res, next) => {
  const t0 = Date.now();
  const from = String(req.ip || "").replace("::ffff:", "");
  console.log(`--> ${req.method} ${req.originalUrl}  from ${from}`);
  res.on("finish", () =>
    console.log(`<-- ${req.method} ${req.originalUrl}  ${res.statusCode}  ${Date.now() - t0}ms`));
  res.on("close", () => {
    if (!res.writableEnded)
      console.log(`x   ${req.method} ${req.originalUrl}  CLIENT GAVE UP after ${Date.now() - t0}ms`);
  });
  next();
});

// Reachability probe. Open http://<laptop-lan-ip>:5000/health in the PHONE's browser.
app.get("/health", (req, res) =>
  res.json({ ok: true, youAre: String(req.ip || "").replace("::ffff:", ""), at: new Date().toISOString() }));

//APIs

app.use("/user", Routes);

// Nothing is allowed to die silently and leave the socket open.
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err?.message || "server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`listening on 0.0.0.0:${PORT}`);
  console.log("\nThis machine's real LAN addresses — try these from the phone:");
  for (const [nic, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === "IPv4" && !a.internal) {
        console.log(`   http://${a.address}:${PORT}/health      [${nic}]`);
      }
    }
  }
  console.log("\nUse the one on the SAME adapter your phone's Wi-Fi is on.");
  console.log("Ignore vEthernet / WSL / VirtualBox / Hyper-V adapters — phones cannot reach those.\n");
});
