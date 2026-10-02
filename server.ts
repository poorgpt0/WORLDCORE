import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Shared server-side Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Gemini Flash Latest Generate Content API
// Handles both prompt string and full contents payload:
// { contents: [{ parts: [{ text: "Explain how AI works in a few words" }] }] }
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, contents } = req.body;
    const inputContents = contents || prompt || 'Explain how AI works in a few words';

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: inputContents,
    });

    res.json({
      text: response.text,
      model: 'gemini-flash-latest',
      status: 'success'
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate content with Gemini',
      status: 'error'
    });
  }
});

// AI NFT Concept & Lore Generation with gemini-flash-latest
app.post('/api/gemini/generate-nft', async (req, res) => {
  try {
    const { prompt } = req.body;
    const userPrompt = prompt || 'A cyberpunk golden ape in a neon city, highly detailed, 4k';

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `You are the chief art curator at BinancePH NFT Studio.
Based on the theme: "${userPrompt}", create a 1-of-1 NFT title, rich cyberpunk lore (under 80 words), aesthetic color palette (array of 3 hex color strings), and 3 rarity traits.
Respond in JSON format with keys:
"title": string,
"lore": string,
"rarity": "Common" | "Rare" | "Epic" | "Legendary",
"colors": string[],
"traits": Array<{ trait_type: string, value: string }>`,
      config: {
        responseMimeType: 'application/json'
      }
    });

    let data = {
      title: 'Neon BNB Sentinel',
      lore: 'Synthesized on the Base ledger, safeguarding the digital heritage of Manila’s Web3 pioneers.',
      rarity: 'Legendary',
      colors: ['#F3BA2F', '#0B0E11', '#00F0FF'],
      traits: [
        { trait_type: 'Origin', value: 'BinancePH Studio' },
        { trait_type: 'Aesthetic', value: 'Cyberpunk' },
        { trait_type: 'Algorithm', value: 'Gemini Flash' }
      ]
    };

    try {
      if (response.text) {
        data = JSON.parse(response.text);
      }
    } catch (e) {
      console.warn('Failed to parse NFT response json, using defaults', e);
    }

    res.json({
      success: true,
      metadata: data,
      prompt: userPrompt
    });
  } catch (error: any) {
    console.error('NFT Lore Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate NFT metadata'
    });
  }
});

// Full-stack Vite dev middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
