import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

  app.post("/api/generatePlan", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      res.json({ text: completion.choices[0]?.message?.content });
    } catch (error: any) {
      console.error("Groq Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/discoverTools", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      console.log("Discovering tools, using Gemini API with Google Search grounding");
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/executeAgent", async (req, res) => {
    try {
      const { prompt, systemInstruction, tools } = req.body;
      
      const needsSearch = tools && tools.some((t: string) => 
        t.toLowerCase().includes("search") || 
        t.toLowerCase().includes("web") || 
        t.toLowerCase().includes("browser")
      );
      
      if (needsSearch) {
        console.log("Agent needs search, using Gemini API with Google Search grounding");
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: prompt,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
          }
        });
        res.json({ text: response.text });
      } else {
        console.log("Agent does not need search, using Groq API");
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          temperature: 0.2,
        });
        res.json({ text: completion.choices[0]?.message?.content });
      }
    } catch (error: any) {
      console.error("Execute Agent Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/evaluateResult", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.1,
      });
      res.json({ text: completion.choices[0]?.message?.content });
    } catch (error: any) {
      console.error("Groq Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/agentSelfReflect", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
      });
      res.json({ text: completion.choices[0]?.message?.content });
    } catch (error: any) {
      console.error("Groq Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/diagnoseFailure", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
      });
      res.json({ text: completion.choices[0]?.message?.content });
    } catch (error: any) {
      console.error("Groq Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chatWithSystem", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
      });
      res.json({ text: completion.choices[0]?.message?.content });
    } catch (error: any) {
      console.error("Groq Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
