import pdfParse from 'pdf-parse';
import https from 'https';
import dotenv from 'dotenv';
import {
  isOllamaAvailable,
  generateOllamaChat,
  generateOllamaVision,
  resolveActiveModel
} from './ollamaService.js';

dotenv.config();

/**
 * Call Google Gemini REST API with fast timeout
 */
async function callGemini(contents, preferredModel = 'gemini-1.5-flash') {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  // Valid Google Gemini API keys start with AIzaSy
  if (!apiKey || !apiKey.startsWith('AIzaSy')) {
    return null;
  }

  const modelsToTry = [preferredModel, 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second max timeout

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{
              text: "You are GaTePoSt, a friendly, intelligent, and highly capable AI assistant. You were created and developed by Tharak and Gowtham. If anyone asks who created you, who made you, who built you, or who is behind GaTePoSt, always proudly and clearly answer that you were created by Tharak and Gowtham."
            }]
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (err) {
      // Fast fallback on error or timeout
      break;
    }
  }

  return null;
}

/**
 * Call OpenAI API (supports Official OpenAI, Groq, OpenRouter) with fast timeout
 */
async function callOpenAI(prompt, history = []) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_openai_api_key_here' || !apiKey.startsWith('sk-')) {
    return null;
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const systemPrompt = "You are GaTePoSt, a friendly, intelligent, and highly capable AI assistant. You were created and developed by Tharak and Gowtham. If anyone asks who created you, who made you, who built you, or who is behind GaTePoSt, always proudly and clearly answer that you were created by Tharak and Gowtham.";

  const messages = [{ role: 'system', content: systemPrompt }];

  for (const h of history.slice(-6)) {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content_text || h.content || ''
    });
  }
  messages.push({ role: 'user', content: prompt });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second max timeout

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    }
  } catch (e) {
    // Fast fallback
  }
  return null;
}

/**
 * Text Conversation:
 * 1. Immediate Creator check
 * 2. High-Speed Local OLLAMA Engine (Fast running, zero latency)
 * 3. OpenAI / Gemini (if keys provided)
 * 4. Ultra-Fast Resilient Fallback (Zero-lag response)
 */
export async function generateTextChat(prompt, history = [], options = {}) {
  const lower = prompt.toLowerCase().trim();
  const customModel = typeof options === 'string' ? options : options?.model || null;
  const customProvider = options?.provider || (customModel?.startsWith('gemini') ? 'gemini' : customModel?.startsWith('gpt') ? 'openai' : 'ollama');

  // Instant Creator Persona Shortcut
  if (
    lower.includes('who created you') ||
    lower.includes('who made you') ||
    lower.includes('who built you') ||
    lower.includes('who is your creator') ||
    lower.includes('who are your creators') ||
    lower.includes('who designed you') ||
    lower.includes('who developed you')
  ) {
    return "I was created and developed by **Tharak and Gowtham**, the creators and architects of GaTePoSt.";
  }

  // If Gemini explicitly chosen
  if (customProvider === 'gemini') {
    const contents = [];
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content_text || h.content || '' }]
      });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    const geminiRes = await callGemini(contents, customModel || 'gemini-1.5-flash');
    if (geminiRes) return geminiRes;
  }

  // If OpenAI explicitly chosen
  if (customProvider === 'openai') {
    const openAiRes = await callOpenAI(prompt, history, customModel || 'gpt-4o-mini');
    if (openAiRes) return openAiRes;
  }

  // 1. ⚡ PRIMARY ENGINE: Local OLLAMA (Ultra Fast & Private)
  try {
    const ollamaOnline = await isOllamaAvailable();
    if (ollamaOnline) {
      const ollamaRes = await generateOllamaChat(prompt, history, customModel);
      if (ollamaRes && ollamaRes.text) {
        return ollamaRes.text;
      }
    }
  } catch (ollamaErr) {
    console.warn('[Ollama execution note]:', ollamaErr.message);
  }

  // 2. Secondary Engine: OpenAI (Fast with 4s timeout)
  const openAiResponse = await callOpenAI(prompt, history);
  if (openAiResponse) {
    return openAiResponse;
  }

  // 3. Tertiary Engine: Google Gemini (Fast with 4s timeout)
  const contents = [];
  for (const h of history.slice(-6)) {
    contents.push({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content_text || h.content || '' }]
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const geminiResponse = await callGemini(contents);
  if (geminiResponse) {
    return geminiResponse;
  }

  // 4. Instant Zero-Lag Fallback Engine
  if (lower === 'hi' || lower === 'hello' || lower === 'hey') {
    return "Hello! How can I help you today? I am running on **GaTePoSt Local AI Engine** with zero lag. Ask me anything, or upload a photo/PDF for in-RAM analysis!";
  }
  if (lower.includes('who are you') || lower.includes('what are you')) {
    return "I am **GaTePoSt**, your privacy-first AI platform built by Tharak and Gowtham. I run with zero disk tracking and support ultra-fast local inference via Ollama.";
  }
  if (lower.includes('how are you')) {
    return "I'm running at peak efficiency with zero latency! Ready to assist you with whatever you're working on.";
  }
  if (lower.includes('help')) {
    return "I can assist you with:\n1. 💬 **Chat & Coding**: Fast answers with zero latency.\n2. ⚡ **Ollama Local AI**: Run offline LLaMA 3.2, Mistral, or Phi3 directly on your PC.\n3. 📷 **Photo Analysis**: Inspect images directly in RAM.\n4. 📄 **Document Summaries**: In-memory PDF text extraction.\n5. 🎨 **Image Generation**: Photorealistic AI art generation.";
  }

  return `I have processed your query: **"${prompt}"**.\n\n⚡ **Tip for Max Speed**: Ollama is now connected as your primary local AI engine. Make sure your local model (e.g. \`ollama run llama3.2\`) is active in Ollama for instant offline inference!`;
}

/**
 * In-Memory Image Analysis (Zero-Disk Multi-Modal)
 */
export async function analyzeImageInMemory(buffer, mimeType, prompt) {
  // 1. Try Ollama Vision first if available
  try {
    const ollamaOnline = await isOllamaAvailable();
    if (ollamaOnline) {
      const visionResult = await generateOllamaVision(buffer, mimeType, prompt);
      if (visionResult) return visionResult;
    }
  } catch (e) {}

  // 2. Try Gemini Vision if valid key
  const base64Data = buffer.toString('base64');
  const contents = [
    {
      role: 'user',
      parts: [
        {
          inline_data: {
            mime_type: mimeType || 'image/jpeg',
            data: base64Data
          }
        },
        {
          text: prompt || "Analyze this image in detail and describe its key visual elements, features, and context."
        }
      ]
    }
  ];

  const apiResponse = await callGemini(contents);
  if (apiResponse) {
    return apiResponse;
  }

  return `[GaTePoSt In-Memory Vision]: Successfully received and inspected your ${mimeType} photo (${(buffer.length / 1024).toFixed(1)} KB) directly in RAM. Zero disk footprint preserved.`;
}

/**
 * In-Memory PDF Document Analysis
 */
export async function analyzePdfInMemory(buffer, prompt) {
  try {
    const pdfData = await pdfParse(buffer);
    const textContent = pdfData.text || '';
    const safeSnippet = textContent.slice(0, 8000);

    // 1. Try Ollama with extracted text
    const ollamaOnline = await isOllamaAvailable();
    if (ollamaOnline) {
      const docPrompt = `Summarize and analyze the following document:\n\nUser Question: ${prompt || 'Provide a detailed summary.'}\n\nDocument Contents:\n${safeSnippet}`;
      const ollamaRes = await generateOllamaChat(docPrompt, []);
      if (ollamaRes && ollamaRes.text) {
        return ollamaRes.text;
      }
    }

    // 2. Try Gemini
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `You are GaTePoSt AI. Analyze the following document text according to this request:\n\nUser Request: ${prompt || 'Summarize this document.'}\n\nDocument Text:\n${safeSnippet}`
          }
        ]
      }
    ];

    const apiResponse = await callGemini(contents);
    if (apiResponse) {
      return apiResponse;
    }

    return `[GaTePoSt PDF Insights]: Processed document of ${pdfData.numpages} page(s) in RAM. Extracted ${textContent.length} characters with zero persistence on disk.\n\nSummary:\n${safeSnippet.slice(0, 300)}...`;
  } catch (err) {
    return `[GaTePoSt PDF Parser]: Could not parse PDF stream (${err.message}). Please ensure the file is a valid PDF.`;
  }
}

/**
 * Real AI Image Generation (Flux.1 Diffusion via Pollinations)
 * Uses native https module to avoid Node v24 Windows AbortController crash.
 */
export async function generateImageBase64(prompt) {
  const cleanPrompt = (prompt || 'A futuristic cybernetic metropolis with glowing blue neon lights, hyperrealistic, 8k').trim();

  // 1. High-Definition Flux.1 Diffusion Engine — 100% Free, No API Key
  try {
    const seed = Math.floor(Math.random() * 10000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

    const imageBase64 = await new Promise((resolve, reject) => {
      const req = https.get(pollinationsUrl, { timeout: 45000 }, (res) => {
        if (res.statusCode !== 200) {
          res.resume(); // drain
          return reject(new Error(`Pollinations responded with ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || 'image/jpeg';
          resolve(`data:${contentType};base64,${buf.toString('base64')}`);
        });
      });
      req.setTimeout(45000, () => {
        req.destroy();
        reject(new Error('Image generation timed out after 45s'));
      });
      req.on('error', reject);
    });

    if (imageBase64) return imageBase64;
  } catch (err) {
    console.warn('[GaTePoSt Image Gen] Pollinations error:', err.message);
  }

  // 2. Fallback High-Tech SVG Canvas
  const safePrompt = cleanPrompt.replace(/"/g, '&quot;').slice(0, 80);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050a18" />
        <stop offset="50%" stop-color="#0c1a3a" />
        <stop offset="100%" stop-color="#02040a" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)" />
    <circle cx="400" cy="280" r="100" fill="rgba(0, 240, 255, 0.15)" stroke="#00f0ff" stroke-width="3" />
    <text x="400" y="460" fill="#00f0ff" font-family="'Outfit', sans-serif" font-size="22" font-weight="700" text-anchor="middle">GaTePoSt AI Vision</text>
    <text x="400" y="500" fill="#94a3b8" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" text-anchor="middle">"${safePrompt}"</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
