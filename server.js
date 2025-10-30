// server.js
import express from "express";
import { WebSocketServer } from "ws";
import crypto from "crypto";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const PUBLIC_HOST = process.env.PUBLIC_HOST; // e.g., customerpull-voice-gateway.onrender.com

// Root check
app.get("/", (req, res) => res.send("CustomerPull Gateway is running!"));

// TwiML endpoint (Twilio hits this). Use ALL so browser GET also works.
app.all("/voice", (req, res) => {
  if (!PUBLIC_HOST) {
    res.status(500).send("PUBLIC_HOST env var not set");
    return;
  }
  const twiml = `
    <Response>
      <Connect>
        <Stream url="wss://${PUBLIC_HOST}/twilio-stream"/>
      </Connect>
    </Response>
  `;
  res.type("text/xml").send(twiml.trim());
});

// --- WebSocket server for Twilio Media Streams ---
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", async (ws) => {
  const callId = crypto.randomUUID();
  console.log("Twilio stream connected:", callId);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.event === "start") console.log("Stream start", msg.start);
      if (msg.event === "media") {
        // msg.media.payload is base64-encoded PCM audio from caller
        // TODO: forward to Gemini Live and stream audio back
      }
      if (msg.event === "dtmf") console.log("DTMF", msg.digits);
      if (msg.event === "stop") console.log("Stream stop");
    } catch (e) {
      console.error("WS parse error", e);
    }
  });

  ws.on("close", () => console.log("Twilio stream closed:", callId));
});

// Upgrade HTTP → WS for the streaming path
const server = app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

server.on("upgrade", (req, socket, head) => {
  if (req.url === "/twilio-stream") {
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req)
    );
  } else {
    socket.destroy();
  }
});
