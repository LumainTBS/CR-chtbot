# Code Red Solutions — AI WhatsApp Chatbot

AI-integrated WhatsApp chatbot built with Node.js, Meta WhatsApp Cloud API,
and Google Gemini AI. Reads live product catalogue from Meta Business Manager.

---

## Folder Structure

```
code-red-chatbot/
├── index.js          ← Main server (all chatbot logic lives here)
├── package.json      ← Project dependencies
├── .env.example      ← Template for your secret keys
├── .gitignore        ← Keeps .env and node_modules off GitHub
└── README.md         ← This file
```

---

## Setup Instructions

### 1. Install Node.js
Download from https://nodejs.org (choose LTS version)

### 2. Install dependencies
Open terminal in this folder and run:
```
npm install
```

### 3. Set up your .env file
- Copy `.env.example` and rename it to `.env`
- Fill in your four keys (see "Getting Your Keys" below)

### 4. Run locally to test
```
npm start
```
You should see: `🚀 Code Red Chatbot server running on port 3000`

---

## Getting Your Keys

### Meta Access Token + Phone Number ID
1. Go to developers.facebook.com → Log in
2. Create App → Business type
3. Add WhatsApp product
4. Go to WhatsApp → API Setup
5. Copy "Temporary Access Token" → ACCESS_TOKEN
6. Copy "Phone number ID" → PHONE_NUMBER_ID

### Catalogue ID
1. Go to business.facebook.com
2. Commerce Manager → Catalogues
3. Open your catalogue → Settings
4. Copy the Catalogue ID → CATALOG_ID

### Gemini API Key
1. Go to aistudio.google.com
2. Sign in with Google
3. Click "Get API Key" → Create API key
4. Copy it → GEMINI_API_KEY

---

## Deploying for Free on Render

1. Create a free account at render.com
2. Push this folder to GitHub (make sure .env is in .gitignore!)
3. On Render: New → Web Service → Connect GitHub repo
4. Set environment variables on Render dashboard:
   - ACCESS_TOKEN
   - PHONE_NUMBER_ID
   - CATALOG_ID
   - GEMINI_API_KEY
5. Deploy — you get a URL like: https://code-red-chatbot.onrender.com

---

## Connecting to Meta (Final Step)

1. In Meta Developer Console → WhatsApp → Configuration
2. Webhook URL: https://your-render-url.onrender.com/webhook
3. Verify Token: coderedtoken123
4. Subscribe to: messages
5. Save — your bot is now LIVE!

---

## How the Catalogue Works

- The bot fetches live product data from your Meta Business catalogue
  every time a customer sends a message.
- If you update stock (e.g. laptops go from 3 to 2), the bot 
  automatically reflects that in its next reply.
- Update stock in: Meta Business Manager → Commerce → Catalogues

---

## The Bot Stays Online Even When:
- The shop is closed
- The owner has no mobile data
- The owner's phone is off
- There is load shedding at the shop

The server runs on Render's cloud 24/7 — completely independent
of the business phone.

---

Built for AIWS 2208 Major Project — Limkokwing University Eswatini, 2026
Group: Malumane · Phetsani · Nokwanda · Scabangile · Msibi
