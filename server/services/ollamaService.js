import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const SYSTEM_PROMPT = "You are GaTePoSt, a friendly, intelligent, ultra-fast AI assistant. You were created and developed by Tharak and Gowtham. If anyone asks who created you, who made you, who built you, or who is behind GaTePoSt, always proudly and clearly answer that you were created by Tharak and Gowtham.";

let inMemoryActiveModel = null;
let inMemoryActiveProvider = 'ollama';

/**
 * Get active model configuration from persistent storage or env
 */
export function getActiveModelConfig() {
  try {
    const dataDir = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'server/data');
    const activeFile = path.join(dataDir, 'active_model.json');
    if (fs.existsSync(activeFile)) {
      const parsed = JSON.parse(fs.readFileSync(activeFile, 'utf8'));
      if (parsed && parsed.model) {
        return parsed;
      }
    }
  } catch (e) {
    // Fall back to memory
  }
  return {
    model: inMemoryActiveModel || process.env.OLLAMA_MODEL || DEFAULT_MODEL,
    provider: inMemoryActiveProvider || 'ollama'
  };
}

/**
 * Persist active model selection
 */
export function setActiveModelConfig(model, provider = 'ollama') {
  inMemoryActiveModel = model;
  inMemoryActiveProvider = provider;
  try {
    const dataDir = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'server/data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const activeFile = path.join(dataDir, 'active_model.json');
    fs.writeFileSync(activeFile, JSON.stringify({ model, provider, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  } catch (e) {
    console.warn('[OllamaService] Could not persist active_model.json:', e.message);
  }
  return { model, provider };
}

/**
 * Check if local Ollama daemon is reachable
 */
export async function isOllamaAvailable() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Retrieve installed local models from Ollama
 */
export async function getOllamaModels() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map(m => m.name);
  } catch (e) {
    return [];
  }
}

/**
 * Resolve which Ollama model to use
 */
export async function resolveActiveModel(explicitModel = null) {
  if (explicitModel) return explicitModel;
  const config = getActiveModelConfig();
  const preferred = config.model;
  const models = await getOllamaModels();
  if (models.length === 0) return preferred;

  // Exact or prefix match (e.g. 'llama3.2:latest' matches 'llama3.2')
  const found = models.find(m => m === preferred || m.startsWith(preferred) || preferred.startsWith(m));
  if (found) return found;

  // Fallback to first installed model
  return models[0];
}

/**
 * Fast Local Text Generation via Ollama
 */
export async function generateOllamaChat(prompt, history = [], customModel = null) {
  const modelToUse = customModel || await resolveActiveModel();

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  for (const h of history.slice(-8)) {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content_text || h.content || ''
    });
  }

  messages.push({ role: 'user', content: prompt });

  try {
    const startTime = Date.now();
    const controller = new AbortController();
    // 60-second generation timeout for heavy models
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const content = data.message?.content;
      if (content) {
        console.log(`[Ollama] ⚡ Generated response using model '${modelToUse}' in ${Date.now() - startTime}ms`);
        return {
          text: content,
          model: modelToUse,
          duration_ms: Date.now() - startTime
        };
      }
    } else {
      const errText = await res.text();
      console.warn(`[Ollama Error ${res.status}]:`, errText.slice(0, 150));

      // If requested model is not downloaded (404), fall back to installed model!
      if (res.status === 404 && customModel) {
        const fallbackModel = await resolveActiveModel();
        if (fallbackModel && fallbackModel !== customModel) {
          console.log(`[Ollama] 🔄 Model '${customModel}' not found in Ollama. Auto-falling back to installed '${fallbackModel}'...`);
          const fbRes = await generateOllamaChat(prompt, history, fallbackModel);
          if (fbRes && fbRes.text) {
            return {
              text: fbRes.text,
              model: fallbackModel,
              duration_ms: fbRes.duration_ms
            };
          }
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[Ollama] Generation timed out');
    } else {
      console.warn('[Ollama API call error]:', err.message);
    }
  }

  return null;
}

/**
 * Vision / Multi-modal query via Ollama (e.g. llama3.2-vision or llava)
 */
export async function generateOllamaVision(buffer, mimeType, prompt) {
  const models = await getOllamaModels();
  const visionModel = models.find(m => 
    m.includes('vision') || m.includes('llava') || m.includes('moondream') || m.includes('bakllava')
  ) || 'llama3.2-vision';

  const base64Image = buffer.toString('base64');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: prompt || "Analyze this image in detail and describe its key visual elements and context.",
            images: [base64Image]
          }
        ],
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.message?.content) {
        return data.message.content;
      }
    }
  } catch (e) {
    console.warn('[Ollama Vision error]:', e.message);
  }

  return null;
}
