const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── ENV Variables ──
const GEMINI_KEY     = process.env.GEMINI_API_KEY;
const TWILIO_ACCOUNT = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER  = process.env.TWILIO_WHATSAPP_NUMBER;

// ── Business Knowledge Base ───────────────────────────────────
const KNOWLEDGE_BASE = `
You are a friendly and professional customer service chatbot for
Code Red Solutions, an IT company in Mbabane, Eswatini.

ABOUT THE BUSINESS:
- Name: Code Red Solutions
- Location: Mbabane CBD, Eswatini
- Contact: WhatsApp only (this chatbot)
- Hours: Monday–Friday 8AM–5PM | Saturday 9AM–2PM | Closed Sunday

SERVICES OFFERED:
- Windows Installation: E150
- OS Repair / Troubleshooting: E120
- Virus & Malware Removal: E100
- Data Recovery: E200–E500 (depends on complexity)
- Hardware Repair (laptop/PC): E80 consultation + parts cost
- Screen Replacement: E300–E600 (depends on device)
- RAM / SSD Upgrades: E80 labour + parts cost
- Network Setup: E200

PRODUCTS IN STOCK:
- HP 255 G9 Laptop | AMD Ryzen 3 | 8GB RAM | 256GB SSD | Price: E4,500 | Units: 3
- Lenovo IdeaPad 3 | Intel Core i3 | 8GB RAM | 512GB SSD | Price: E5,200 | Units: 2
- Dell Inspiron 15 | Intel Core i5 | 8GB RAM | 512GB SSD | Price: E6,800 | Units: 2
- Acer Aspire 5 | AMD Ryzen 5 | 16GB RAM | 512GB SSD | Price: E7,500 | Units: 1
- HP Pavilion x360 | Intel Core i5 | 8GB RAM | 256GB SSD | Touchscreen | Price: E8,200 | Units: 1
- Lenovo ThinkPad E14 | Intel Core i5 | 16GB RAM | 512GB SSD | Price: E9,500 | Units: 2
- Dell Latitude 3420 | Intel Core i5 | 8GB RAM | 256GB SSD | Price: E7,800 | Units: 1
- HP 14s | Intel Celeron | 4GB RAM | 128GB SSD | Price: E3,200 | Units: 4
- Acer Chromebook 314 | Intel Celeron | 4GB RAM | 64GB eMMC | Price: E2,800 | Units: 2
- Lenovo V15 | AMD Ryzen 3 | 8GB RAM | 256GB SSD | Price: E4,800 | Units: 3
- Samsung 8GB DDR4 RAM Stick | Price: E450 | Units: 10
- Kingston 256GB SSD | Price: E380 | Units: 8
- Kingston 512GB SSD | Price: E620 | Units: 6
- Logitech Wireless Mouse | Price: E180 | Units: 15
- HP Wireless Keyboard & Mouse Combo | Price: E350 | Units: 7
- TP-Link WiFi Router | Price: E480 | Units: 5
- HDMI Cable 1.8m | Price: E80 | Units: 20
- USB-C Hub 7-in-1 | Price: E320 | Units: 6
- Laptop Cooling Pad | Price: E220 | Units: 8
- Antivirus Software (1 Year License) | Price: E150 | Units: 12

IMPORTANT RULES:
1. ONLY answer questions related to Code Red Solutions.
2. Keep replies SHORT, friendly and professional.
3. If asked about repair job status say: "Let me check that for you — please hold while I connect you to our team."
4. If question is too complex say: "Let me connect you to one of our technicians for that."
5. Always complete your sentences fully — never stop mid-sentence.
6. Keep responses under 4 sentences to ensure they are always complete.
7. Do NOT make up prices or services not listed above.
8. Use stock data accurately — if Units is 0 say the item is out of stock.
9. If stock is low (under 3 units) mention it so the customer can act fast.
`;

// ── Ask Gemini AI ─────────────────────────────────────────────
async function getAIReply(userMessage) {
  try {
    const prompt = `
${KNOWLEDGE_BASE}

Customer message: "${userMessage}"

Your reply:
`;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
        },
      }
    );
    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply || getFallbackReply();
  } catch (err) {
    console.error("Gemini error:", err.response?.data || err.message);
    return getFallbackReply();
  }
}

// ── Fallback reply ────────────────────────────────────────────
function getFallbackReply() {
  return (
    "Hi! 👋 Thanks for reaching out to Code Red Solutions.\n\n" +
    "We're here to help with all your IT needs in Mbabane.\n" +
    "Our team will get back to you shortly. ⏳\n\n" +
    "Visit us: Monday–Friday 8AM–5PM | Saturday 9AM–2PM."
  );
}

// ── Send WhatsApp Message via Twilio ──────────────────────────
async function sendMessage(to, message) {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT}/Messages.json`;
    await axios.post(
      url,
      new URLSearchParams({
        From: TWILIO_NUMBER,
        To: `whatsapp:${to}`,
        Body: message,
      }),
      {
        auth: {
          username: TWILIO_ACCOUNT,
          password: TWILIO_TOKEN,
        },
      }
    );
    console.log(`✅ Message sent to ${to}`);
  } catch (err) {
    console.error("Send message error:", err.response?.data || err.message);
  }
}

// ── Receive Incoming Messages from Twilio ─────────────────────
app.post("/webhook", async (req, res) => {
  res.status(200).end();

  try {
    const from = req.body.From?.replace("whatsapp:", "");
    const text = req.body.Body;

    if (!from || !text) return;

    console.log(`📩 Message from ${from}: "${text}"`);

    const reply = await getAIReply(text);
    await sendMessage(from, reply);

  } catch (err) {
    console.error("Webhook error:", err.message);
  }
});

// ── Health Check ──────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("✅ Code Red Solutions Chatbot is running.");
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Code Red Chatbot server running on port ${PORT}`);
});
