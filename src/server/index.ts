import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { PythLazerSource } from "./sources/pyth-lazer.js";
import { PriceStore } from "./store.js";
import type { ServerMessage, ClientMessage } from "./types.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const PYTH_TOKEN = process.env.PYTH_LAZER_TOKEN;

if (!PYTH_TOKEN) {
  console.error(
    "ERROR: PYTH_LAZER_TOKEN environment variable is required.\n" +
      "Get a token from https://docs.pyth.network/price-feeds/pro/getting-started\n" +
      "Add it to your .env file: PYTH_LAZER_TOKEN=your_token_here",
  );
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
const store = new PriceStore();

// --- Data Source ---
const pythSource = new PythLazerSource(PYTH_TOKEN, [1, 2, 3, 5]);

pythSource.on("price", (update) => {
  store.add(update);
  broadcast({ type: "price", data: update });
});

pythSource.on("connected", () => {
  console.log("[Pyth Lazer] Connected to price feeds");
  broadcast({ type: "status", connected: true, source: "pyth-lazer" });
});

pythSource.on("error", (err) => {
  console.error("[Pyth Lazer] Error:", err.message);
  broadcast({ type: "error", message: `Pyth Lazer: ${err.message}` });
});

pythSource.on("disconnected", () => {
  console.log("[Pyth Lazer] Disconnected");
  broadcast({ type: "status", connected: false, source: "pyth-lazer" });
});

// --- REST API ---
app.get("/api/symbols", (_req, res) => {
  res.json(pythSource.getSymbols());
});

app.get("/api/history/:symbol/ohlc", (req, res) => {
  const { symbol } = req.params;
  const resolution = parseInt(req.query.resolution as string) || 60;
  const bars = store.getOHLC("pyth-lazer", symbol.toUpperCase(), resolution);
  res.json(bars);
});

app.get("/api/prices", (_req, res) => {
  res.json(store.getAllLatest());
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    pythConnected: pythSource.isConnected(),
    symbols: pythSource.getSymbols().length,
  });
});

// --- WebSocket ---
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (total: ${clients.size})`);

  // Send current state on connect
  const statusMsg: ServerMessage = {
    type: "status",
    connected: pythSource.isConnected(),
    source: "pyth-lazer",
  };
  ws.send(JSON.stringify(statusMsg));

  // Send current prices snapshot
  for (const price of store.getAllLatest()) {
    ws.send(JSON.stringify({ type: "price", data: price }));
  }

  // Send symbols list
  ws.send(
    JSON.stringify({
      type: "symbols",
      data: pythSource.getSymbols(),
    }),
  );

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as ClientMessage;
      handleClientMessage(ws, msg);
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (total: ${clients.size})`);
  });
});

function handleClientMessage(ws: WebSocket, msg: ClientMessage): void {
  switch (msg.type) {
    case "getHistory": {
      const resolutionSeconds = parseInt(msg.resolution) || 60;
      const bars = store.getOHLC(
        "pyth-lazer",
        msg.symbol.toUpperCase(),
        resolutionSeconds,
      );
      const response: ServerMessage = {
        type: "history",
        symbol: msg.symbol.toUpperCase(),
        bars,
      };
      ws.send(JSON.stringify(response));
      break;
    }
  }
}

function broadcast(msg: ServerMessage): void {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

// --- Start ---
server.listen(PORT, async () => {
  console.log(`[Server] HTTP + WS listening on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}/ws`);

  try {
    await pythSource.connect();
  } catch (err) {
    console.error("[Server] Failed to connect to Pyth Lazer:", err);
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[Server] Shutting down...");
  await pythSource.disconnect();
  wss.close();
  server.close();
  process.exit(0);
});
