import express from "express";
import path from "path";
import Stripe from "stripe";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe | null {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      stripeClient = new Stripe(key);
    }
  }
  return stripeClient;
}

const ai = new GoogleGenAI({}); // Automatically picks up GEMINI_API_KEY

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/match-creators", async (req, res) => {
    try {
      const { campaignDescription, creators } = req.body;
      if (!campaignDescription || !creators || !Array.isArray(creators)) {
        return res.status(400).json({ error: "Missing campaignDescription or creators" });
      }

      const prompt = `
        You are an AI matching engine. 
        Campaign Description: "${campaignDescription}"
        
        Available Creators (JSON):
        ${JSON.stringify(creators.map(c => ({ id: c.id, name: c.name, bio: c.bio, niche: c.niche })), null, 2)}
        
        For each creator, analyze their compatibility with the campaign. 
        Return ONLY a raw JSON array of objects with the following schema:
        [
          {
            "id": "creator_id",
            "matchPercentage": 98,
            "reason": "Brief 1-sentence reason why they match"
          }
        ]
      `;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      let text = aiResponse.text || "[]";
      // Clean up markdown code blocks if any
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const matchScores = JSON.parse(text);
      res.json(matchScores);
    } catch (error: any) {
      console.error("Gemini Match Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for Stripe Payment Intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured on the server." });
      }

      const { amount, userId } = req.body;

      if (!amount || !userId) {
        return res.status(400).json({ error: "Missing amount or userId" });
      }

      // Create a PaymentIntent with the specified amount.
      // Stripe expects amounts in cents, so we multiply by 100
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        metadata: {
          userId: userId
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify Payment Route (Optional backend verification/minting logic if you want the backend to securely write to Firestore via admin, but since we don't have Admin SDK set up, we'll confirm on the client side still, or simulate it. For real system we'd use webhooks.)
  // We'll let the user know Webhooks require external URL access and Admin SDK.

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In express 4 we can use * but in v5 it's *all. The package.json says ^4.21.2 so * is fine.
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
