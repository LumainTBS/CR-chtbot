const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ── ENV Variables (set these in Render or your .env file) ──
const ACCESS_TOKEN   = process.env.ACCESS_TOKEN;
const PHONE_ID       = process.env.PHONE_NUMBER_ID;
const GEMINI_KEY     = process.env.GEMINI_API_KEY;
const CATALOG_ID     = process.env.CATALOG_ID;
const VERIFY_TOKEN   = "coderedtoken123"; // must match what you set in Meta Console

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
6. Do NOT make up prices or services not listed above.
7. If stock information is provided, use it accurately in your response.
`;

// ── Fetch Live Catalogue from Meta ───────────────────────────
async function getCatalogue() {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${1516074050187034}/products`,
      {
        params: {
          fields: "name,price,availability,description,quantity_to_sell_on_facebook,image_url",
          limit: 50,
          access_token: EAAWGbWAjY2UBRrBepTYVNMXLR7i5E9Cg8APBUPcFTJtVefcdhmPr0ZA6RHK2ZCXuGxb8M29Dte0ZC4f7y46APvZCNLwZABt0eAxHZB49gkaD4dLuwzquXVPNnjiIEL2FVF0jTlqdKAqc2qHh8Kz6o80IKo86GrzN5S2cZBDT8htr9iHWqRMZA54E7AhViLGt31rK9nCQX23Uq6VJ4mjPCRlLTjUULiksNiYZBgkZBqBam8QmcKqdL6ycNFZASf2bMY3rfprYKFucTLhl0pzBxiBZBqjrKAYXcpDCvDcIaAZDZD,
        },
      }
    );

    const products = response.data.data;

    if (!products || products.length === 0) {
      return "No products currently listed in the catalogue.";
    }

    // Format catalogue into readable text for the AI
    const formatted = products.map((p) => {
      const qty = p.quantity_to_sell_on_facebook ?? "Unknown";
      const available = p.availability === "in stock" ? "✅ In Stock" : "❌ Out of Stock";
      return `- ${p.name} | Price: E${p.price} | ${available} | Units left: ${qty}${p.description ? " | " + p.description : ""}`;
    }).join("\n");

    return formatted;

  } catch (err) {
    console.error("Catalogue fetch error:", err.response?.data || err.message);
    // If catalogue fetch fails, return a fallback so the bot still works
    return "Catalogue temporarily unavailable.";
  }
}

// ── Ask Gemini AI ─────────────────────────────────────────────
async function getAIReply(userMessage) {
  try {
    // Fetch live catalogue every time a message comes in
    const catalogueData = await getCatalogue();

    const prompt = `
${KNOWLEDGE_BASE}

CURRENT PRODUCT CATALOGUE (live stock data):
${catalogueData}

Customer message: "${userMessage}"

Your reply:
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${AIzaSyB4EusGsKUYaKNIzJ_NaWMpVrer5pSBFdE}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,      // lower = more consistent, less random
          maxOutputTokens: 300,  // keep replies short
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

// ── Fallback reply if AI fails ────────────────────────────────
function getFallbackReply() {
  return (
    "Hi! 👋 Thanks for reaching out to Code Red Solutions.\n\n" +
    "We're here to help with all your IT needs in Mbabane.\n" +
    "Our team will get back to you shortly. ⏳\n\n" +
    "Or visit us at our shop: Monday–Friday 8AM–5PM | Saturday 9AM–2PM."
  );
}

// ── Send WhatsApp Message ─────────────────────────────────────
async function sendMessage(to, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${+26879846902}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${EAAWGbWAjY2UBRrBepTYVNMXLR7i5E9Cg8APBUPcFTJtVefcdhmPr0ZA6RHK2ZCXuGxb8M29Dte0ZC4f7y46APvZCNLwZABt0eAxHZB49gkaD4dLuwzquXVPNnjiIEL2FVF0jTlqdKAqc2qHh8Kz6o80IKo86GrzN5S2cZBDT8htr9iHWqRMZA54E7AhViLGt31rK9nCQX23Uq6VJ4mjPCRlLTjUULiksNiYZBgkZBqBam8QmcKqdL6ycNFZASf2bMY3rfprYKFucTLhl0pzBxiBZBqjrKAYXcpDCvDcIaAZDZD}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Message sent to ${to}`);
  } catch (err) {
    console.error("Send message error:", err.response?.data || err.message);
  }
}

// ── Send a "typing..." indicator (feels more natural) ──────────
async function sendTypingIndicator(to, messageId) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${+26879846902}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
      { headers: { Authorization: `Bearer ${EAAWGbWAjY2UBRrBepTYVNMXLR7i5E9Cg8APBUPcFTJtVefcdhmPr0ZA6RHK2ZCXuGxb8M29Dte0ZC4f7y46APvZCNLwZABt0eAxHZB49gkaD4dLuwzquXVPNnjiIEL2FVF0jTlqdKAqc2qHh8Kz6o80IKo86GrzN5S2cZBDT8htr9iHWqRMZA54E7AhViLGt31rK9nCQX23Uq6VJ4mjPCRlLTjUULiksNiYZBgkZBqBam8QmcKqdL6ycNFZASf2bMY3rfprYKFucTLhl0pzBxiBZBqjrKAYXcpDCvDcIaAZDZD}` } }
    );
  } catch (_) {
    // Non-critical — ignore errors here
  }
}

// ── Webhook Verification (required by Meta) ───────────────────
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta");
    res.status(200).send(challenge);
  } else {
    console.warn("❌ Webhook verification failed");
    res.sendStatus(403);
  }
});

// ── Receive Incoming Messages ─────────────────────────────────
app.post("/webhook", async (req, res) => {
  // Always respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const body    = req.body;
    const entry   = body.entry?.[0];
    const change  = entry?.changes?.[0];
    const value   = change?.value;
    const message = value?.messages?.[0];

    // Only process text messages
    if (!message || message.type !== "text") return;

    const from      = message.from;       // customer's phone number
    const text      = message.text.body;  // their message
    const messageId = message.id;

    console.log(`📩 Message from ${from}: "${text}"`);

    // Mark as read + send typing indicator
    await sendTypingIndicator(from, messageId);

    // Get AI reply (includes live catalogue)
    const reply = await getAIReply(text);

    // Send reply back to customer
    await sendMessage(from, reply);

  } catch (err) {
    console.error("Webhook processing error:", err.message);
  }
});

// ── Health Check Route (Render uses this to keep server alive) ─
app.get("/", (req, res) => {
  res.send("✅ Code Red Solutions Chatbot is running.");
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Code Red Chatbot server running on port ${PORT}`);
});
