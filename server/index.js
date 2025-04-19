const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { google } = require("googleapis");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Start server
app.listen(3001, () => console.log("✅ Server running on http://localhost:3001"));

// 🔐 Google OAuth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 👉 Step 1: Redirect to consent screen
app.get("/auth/google", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  res.redirect(authUrl);
});

// 👉 Step 2: Callback
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
    const userInfo = await oauth2.userinfo.get();

    console.log("✅ Gmail Connected:");
    console.log("Email:", userInfo.data.email);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      q: "is:unread",
      maxResults: 5,
    });

    const messages = response.data.messages || [];
    const emailSummaries = [];

    if (messages.length === 0) {
      console.log("No unread messages found.");
    } else {
      console.log(`Found ${messages.length} unread messages:`);

      for (const msg of messages) {
        const msgData = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const headers = msgData.data.payload.headers;

        const subject = headers.find(h => h.name === "Subject")?.value || "(No subject)";
        const from = headers.find(h => h.name === "From")?.value || "(Unknown sender)";
        const date = headers.find(h => h.name === "Date")?.value || "(Unknown date)";

        const summary = { subject, from, date };
        emailSummaries.push(summary);
        console.log("🧾 Parsed message:", summary);
      }
    }

    // ✅ Redirect to frontend with encoded summaries
    const encoded = encodeURIComponent(JSON.stringify(emailSummaries));
    res.redirect(`http://localhost:5173/?emails=${encoded}`);

  } catch (err) {
    console.error("❌ Error during Google auth:", err);
    res.status(500).send("Google Authentication Failed");
  }
});

// ✅ GPT Analyzer Endpoint
app.post("/api/emails/analyze", async (req, res) => {
  const { emails } = req.body;

  if (!emails || emails.length === 0) {
    return res.status(400).json({ error: "No emails provided" });
  }

  const emailList = emails.map(e =>
    `Subject: ${e.subject}\nFrom: ${e.from}\nDate: ${e.date}`
  ).join("\n\n");

  const prompt = `
You are an AI inbox assistant.
Your task is to analyze unread email summaries and respond ONLY with a valid JSON array.
Each object must include:
- subject
- from
- date
- action (Reply, Archive, or Ignore)
- reason (short explanation)

Do NOT include markdown formatting or backticks.

[
  {
    "subject": "Example subject",
    "from": "sender@example.com",
    "date": "Mon, 1 Apr 2025 10:00:00 -0700",
    "action": "Reply",
    "reason": "Brief explanation of why"
  }
]

Emails:
${emailList}
`;

  try {
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [{ role: "user", content: prompt }],
    });

    const aiReply = gptResponse.choices[0].message.content;
    console.log("🔍 GPT Raw Reply:", aiReply);

    res.json({ suggestions: aiReply });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "Failed to analyze emails." });
  }
});
