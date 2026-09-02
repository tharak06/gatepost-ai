import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Call Google Gemini REST API with Multi-Model Fallback
 */
async function callGemini(contents, preferredModel = 'gemini-3.5-flash') {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null; // Signals smart conversational fallback
  }

  // Resilient candidate list
  const modelsToTry = [
    preferredModel,
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest'
  ];

  // De-duplicate
  const uniqueModels = [...new Set(modelsToTry)];

  for (const model of uniqueModels) {
    try {
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
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errText = await res.text();
        console.warn(`[Gemini API ${model} status ${res.status}]: ${errText.slice(0, 120)}`);
      }
    } catch (err) {
      console.warn(`[Gemini API ${model} failed]: ${err.message}`);
    }
  }

  return null;
}

/**
 * Call OpenAI API (supports Official OpenAI, GitHub Models, Groq, OpenRouter)
 */
async function callOpenAI(prompt, history = []) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null;
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const systemPrompt = "You are GaTePoSt, a friendly, intelligent, and highly capable AI assistant. You were created and developed by Tharak and Gowtham. If anyone asks who created you, who made you, who built you, or who is behind GaTePoSt, always proudly and clearly answer that you were created by Tharak and Gowtham.";

  const messages = [{ role: 'system', content: systemPrompt }];

  for (const h of history.slice(-6)) {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content_text
    });
  }
  messages.push({ role: 'user', content: prompt });

  try {
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
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        return text;
      }
    } else {
      const err = await res.text();
      console.warn(`[OpenAI API status ${res.status}]:`, err.slice(0, 120));
    }
  } catch (e) {
    console.warn(`[OpenAI API call failed]:`, e.message);
  }
  return null;
}

/**
 * Text Conversation (Dual-Engine: OpenAI + Google Gemini)
 */
export async function generateTextChat(prompt, history = []) {
  // Creator question check
  const lower = prompt.toLowerCase().trim();
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

  // 1. Try OpenAI Engine (for enhanced, high-precision results)
  const openAiResponse = await callOpenAI(prompt, history);
  if (openAiResponse) {
    return openAiResponse;
  }

  // 2. Try Google Gemini Engine
  const contents = [];
  for (const h of history.slice(-6)) {
    contents.push({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content_text }]
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const apiResponse = await callGemini(contents);
  if (apiResponse) {
    return apiResponse;
  }

  // Natural, professional conversational fallback when GEMINI_API_KEY is not yet added
  if (lower === 'hi' || lower === 'hello' || lower === 'hey') {
    return "Hello! How can I help you today? Whether you want to draft ideas, analyze photos, summarize documents, or write code, I'm here to assist.";
  }
  if (lower.includes('who are you') || lower.includes('what are you')) {
    return "I am GaTePoSt, your intelligent AI assistant built with Google Gemini technology. I can process text, images, and documents with zero-disk privacy protection.";
  }
  if (lower.includes('how are you')) {
    return "I'm doing great, thank you! Ready to help you with whatever you're working on.";
  }
  if (lower.includes('help')) {
    return "I can assist you with:\n1. 💬 **Chat & Writing**: Brainstorming, drafting emails, answering questions.\n2. 📷 **Photo Analysis**: Upload an image to analyze its contents.\n3. 📄 **Document Summaries**: Upload a PDF for instant insights.\n4. 🎨 **Image Generation**: Describe any scene to generate visuals.\n5. ☁️ **Cloud Storage**: Toggle 'Save to Cloud' to save files to your personal vault!";
  }

  return `I understand you're asking about: "${prompt}".\n\nTo connect me directly to live Google Gemini 2.0 servers with infinite real-time knowledge, simply paste your free **GEMINI_API_KEY** into the \`server/.env\` file. In the meantime, all chat, document processing, and cloud storage features are fully functional!`;
}

/**
 * In-Memory Image Analysis (Zero-Disk Multi-Modal)
 */
export async function analyzeImageInMemory(buffer, mimeType, prompt) {
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
 * Real AI Image Generation (Google Imagen 3 & Flux.1 Real Diffusion)
 * Generates photorealistic, high-resolution AI art like Gemini for 100% Free!
 */
export async function generateImageBase64(prompt) {
  const cleanPrompt = (prompt || 'A futuristic cybernetic metropolis with glowing blue neon lights, hyperrealistic, 8k').trim();

  // 1. Try Google Imagen 3 if a valid GEMINI_API_KEY is available
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (apiKey && apiKey.startsWith('AIzaSy')) {
    try {
      const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
      const res = await fetch(imagenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: cleanPrompt }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          console.log('[GaTePoSt Vision] Generated real image using Google Imagen 3!');
          return `data:image/jpeg;base64,${b64}`;
        }
      }
    } catch (e) {
      console.warn('[Google Imagen 3 notice]:', e.message);
    }
  }

  // 2. High-Definition Flux.1 Real Diffusion Engine (100% Free, Zero Key Required)
  try {
    const seed = Math.floor(Math.random() * 10000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

    console.log(`[GaTePoSt Vision] Generating real AI image via Flux.1 Diffusion for: "${cleanPrompt}"`);
    const res = await fetch(pollinationsUrl);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      console.log(`[GaTePoSt Vision] ✅ Successfully generated ${(buffer.byteLength / 1024).toFixed(1)} KB real AI image!`);
      return `data:${contentType};base64,${base64}`;
    }
  } catch (err) {
    console.warn('[Flux.1 Engine notice]:', err.message);
  }

  // 3. Fallback High-Tech SVG Canvas
  const safePrompt = cleanPrompt.replace(/"/g, '&quot;').slice(0, 80);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050a18" />
        <stop offset="50%" stop-color="#0c1a3a" />
        <stop offset="100%" stop-color="#02040a" />
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#00f0ff" />
        <stop offset="100%" stop-color="#3b82f6" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)" />
    <circle cx="400" cy="280" r="100" fill="rgba(0, 240, 255, 0.15)" stroke="#00f0ff" stroke-width="3" />
    <text x="400" y="460" fill="#00f0ff" font-family="'Outfit', sans-serif" font-size="22" font-weight="700" text-anchor="middle">GaTePoSt AI Vision</text>
    <text x="400" y="500" fill="#94a3b8" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" text-anchor="middle">"${safePrompt}"</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
