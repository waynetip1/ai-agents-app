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

// 🧠 Basic GPT test route
app.post("/api/agent", async (req, res) => {
  const { prompt } = req.body;

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ response: chat.choices[0].message.content });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "Failed to get response from OpenAI." });
  }
});

// ✅ Start server
app.listen(3001, () => console.log("✅ Server running on http://localhost:3001"));

// 🔐 Google OAuth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Step 1: Redirect user to Gmail consent screen
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

// Step 2: Handle callback and fetch tokens
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
    const userInfo = await oauth2.userinfo.get();

    console.log("✅ Gmail Connected:");
    console.log("Email:", userInfo.data.email);
    console.log("Access Token:", tokens.access_token);
    console.log("Refresh Token:", tokens.refresh_token);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      q: "is:unread",
      maxResults: 5,
    });

    const messages = response.data.messages || [];

    if (messages.length === 0) {
      console.log("No unread messages found.");
    } else {
      console.log(`Found ${messages.length} unread messages:`);

      const emailSummaries = [];

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

        emailSummaries.push(`Subject: ${subject}\nFrom: ${from}\nDate: ${date}`);
      }

      // 🧠 Construct the GPT prompt
      const prompt = `
You are an AI inbox assistant. Analyze the following unread emails and suggest an action for each:
- Archive
- Reply
- Ignore

Respond in this JSON format:
[
  { "subject": "...", "action": "...", "reason": "..." }
]

Emails:
${emailSummaries.join("\n\n")}
`;

      console.log("\n🧠 Prompt to GPT:\n", prompt);

      const gptResponse = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [{ role: "user", content: prompt }],
      });

      const aiReply = gptResponse.choices[0].message.content;
      console.log("🔍 GPT Raw Reply:", aiReply);
    }

    res.send("✅ Gmail connected! You can close this window.");
  } catch (err) {
    console.error("❌ Error during Google auth:", err);
    res.status(500).send("Google Authentication Failed");
  }
});

// ✅ POST route for frontend GPT analysis
app.post("/api/emails/analyze", async (req, res) => {
  const { emails } = req.body;

  if (!emails || emails.length === 0) {
    return res.status(400).json({ error: "No emails provided" });
  }

  const emailList = emails.map(e =>
    `Subject: ${e.subject}\nFrom: ${e.from}\nDate: ${e.date}`
  ).join("\n\n");

  const prompt = `
You are an AI inbox assistant. Analyze the following unread emails and suggest an action for each:
- Archive
- Reply
- Ignore

Only respond with a JSON array like this (no intro, no markdown):

[
  { "subject": "..." , "action": "...", "reason": "..." }
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
