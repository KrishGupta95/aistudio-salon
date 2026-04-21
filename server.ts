import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/notify", async (req, res) => {
    const { type, data } = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error(">>> [Notify] Missing Telegram Config");
      return res.status(500).json({ error: "Telegram configuration missing" });
    }

    let message = "";
    if (type === "booking") {
      message = `
🏛 *NEW BOOKING AT ATELIER*

👤 *Customer:* ${data.clientName}
📧 *Email:* ${data.clientEmail || 'N/A'}
📞 *Phone:* ${data.clientPhone || 'N/A'}
✂️ *Service:* ${data.serviceName}
✨ *Expert:* ${data.staffName}
📅 *Date:* ${data.date}
⏰ *Time:* ${data.time}
💰 *Price:* ${data.price}
🆔 *Booking ID:* ${data.id}
👤 *User Type:* ${data.userType ? data.userType.toUpperCase() : 'N/A'}
💳 *Status:* ${data.status ? data.status.toUpperCase() : 'PENDING'}
📝 *Notes:* ${data.notes || 'No extra notes provided.'}

_Curated by Atelier Sanctuary_
      `;
    } else if (type === "cancellation") {
      message = `
❌ *BOOKING CANCELLED*

👤 *Customer:* ${data.clientName}
✂️ *Service:* ${data.serviceName}
📅 *Date:* ${data.date}
⏰ *Time:* ${data.time}
🆔 *Booking ID:* ${data.id}
      `;
    } else if (type === "signup") {
      message = `
🆕 *NEW ARTISAN JOINED*

👤 *Name:* ${data.name}
📧 *Email:* ${data.email}
📅 *Joined:* ${new Date().toLocaleString()}
      `;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "Markdown"
        })
      });

      if (!response.ok) {
        throw new Error(`Telegram API failed: ${response.statusText}`);
      }

      const result = await response.json();
      res.json({ success: true, result });
    } catch (error: any) {
      console.error(">>> [Notify] Telegram Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from the 'dist' directory in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Fallback to index.html for SPA routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Atelier Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
