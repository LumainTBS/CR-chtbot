const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Required for Twilio

// ── ENV Variables ──
const GEMINI_KEY      = process.env.GEMINI_API_KEY;
const CATALOG_ID      = process.env.CATALOG_ID;
const ACCESS_TOKEN    = process.env.ACCESS_TOKEN;
const TWILIO_ACCOUNT  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN    = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER   = process.env.TWILIO_WHATSAPP_NUMBER; // e.g. whatsapp:+14155238886

// ── Business Knowledge Base ──────────────────────────────────
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

IMPORTANT RULES:
1. ONLY answer questions related to Code Red Solutions.
2. Keep all replies SHORT, friendly and professional.
3. If asked about a specific repair job status, say: 
   "Let me check that for you — please hold while I connect you to our team."
4. If a question is too complex or outside your knowledge, say:
   "That's a great question — let me connect you to one of our technicians for that."
5. Always end with a helpful follow-up like "Is there anything else I can help you with?"
6. CRITICAL: Always write complete, full sentences. Never stop mid-sentence. If you are running out of space, finish your current sentence and stop there.
7. Keep responses under 3 sentences maximum to ensure they are always complete.
8. Do NOT make up prices or services not listed above.
9. If stock information is provided, use it accurately in your response.
`;

// ── Fetch Live Catalogue from Meta ───────────────────────────
async function getCatalogue() {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${CATALOG_ID}/products`,
      {
        params: {
          fields: "name,price,availability,description,quantity_to_sell_on_facebook",
          limit: 50,
          access_token: ACCESS_TOKEN,
        },
      }
    );
    const products = response.data.data;
     console.log("Catalogue data:", JSON.stringify(products));
    if (!products || products.length === 0) return "No products currently listed.";
    return products.map((p) => {
      const qty = p.quantity_to_sell_on_facebook ?? "Unknown";
      const available = p.availability === "in stock" ? "✅ In Stock" : "❌ Out of Stock";
      return `- ${p.name} | Price: E${p.price} | ${available} | Units left: ${qty}`;
    }).join("\n");
  } catch (err) {
    console.log("Catalogue ERROR:", JSON.stringify(err.response?.data || err.message));
    return "Catalogue temporarily unavailable.";
}
}

// ── Ask Gemini AI ─────────────────────────────────────────────
async function getAIReply(userMessage) {
  try {
    const catalogueData = await getCatalogue();
    const prompt = `
${KNOWLEDGE_BASE}

CURRENT PRODUCT CATALOGUE (live stock data):
${catalogueData}

Customer message: "${userMessage}"

Your reply:
`;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
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
    "Or visit us at our shop: Monday–Friday 8AM–5PM | Saturday 9AM–2PM."
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
  res.status(200).end(); // Respond immediately

  try {
    const from = req.body.From?.replace("whatsapp:", ""); // customer number
    const text = req.body.Body; // their message

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
