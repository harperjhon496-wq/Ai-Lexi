import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini Tips API
  app.post("/api/gemini/tips", async (req, res) => {
    const { profile, transactions } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a savvy financial advisor. Provide 3 short, punchy, and actionable financial tips for a user with the following profile: ${JSON.stringify(profile)} and recent transactions: ${JSON.stringify(transactions)}. Format as a bulleted list in Markdown.`,
      });
      res.json({ tips: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate tips" });
    }
  });

  // Mock Bank Sync API
  app.post("/api/bank/sync", (req, res) => {
    // Simulated transactions
    const mockTransactions = [
      { id: '1', amount: 45.50, description: 'Grocery Store', category: 'Food', type: 'expense', date: new Date().toISOString(), source: 'bank_sync' },
      { id: '2', amount: 12.99, description: 'Streaming Service', category: 'Entertainment', type: 'expense', date: new Date().toISOString(), source: 'bank_sync' },
      { id: '3', amount: 2500, description: 'Monthly Salary', category: 'Income', type: 'income', date: new Date().toISOString(), source: 'bank_sync' },
      { id: '4', amount: 120.00, description: 'Gas Station', category: 'Travel', type: 'expense', date: new Date().toISOString(), source: 'bank_sync' },
    ];
    res.json({ transactions: mockTransactions });
  });

  // Mock Withdrawal API
  app.post("/api/wallet/withdraw", (req, res) => {
    const { amount, type, detail } = req.body;
    // In a real app, this would trigger a payment gateway or banking API
    res.json({ 
      success: true, 
      message: `Successfully initiated withdrawal of $${amount} to ${type}: ${detail}`,
      transactionId: `WD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    });
  });

  // Gmail Send API
  app.post("/api/mail/send-withdrawal-receipt", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const accessToken = authHeader.split(" ")[1];
    const { to, amount, type, detail, transactionId } = req.body;

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    const subject = 'Withdrawal Confirmation - Budgee';
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `From: Budgee <me>`,
      `To: ${to}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      `Subject: ${utf8Subject}`,
      '',
      `<h1>Withdrawal Successful</h1>`,
      `<p>Your withdrawal of <strong>$${amount}</strong> has been initiated.</p>`,
      `<ul>`,
      `  <li><strong>Method:</strong> ${type}</li>`,
      `  <li><strong>Destination:</strong> ${detail}</li>`,
      `  <li><strong>Transaction ID:</strong> ${transactionId}</li>`,
      `</ul>`,
      `<p>Funds should reach your account within 24-48 hours.</p>`,
      `<p>Thank you for using Budgee!</p>`
    ];
    const message = messageParts.join('\n');

    // The body needs to be base64url encoded.
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to send email:', error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
