// client/src/services/localDiskService.js
// Privacy-first on-disk chat storage using the modern File System Access API & IndexedDB

const DB_NAME = 'GatePost_Disk_DB';
const DB_VERSION = 1;
const STORE_NAME = 'folder_handles';
const HANDLE_KEY = 'chat_storage_dir';

/**
 * Open or create IndexedDB to store directory handle across page reloads
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this browser'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if the browser supports native Directory Picker
 */
export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

/**
 * Retrieve saved Directory Handle from IndexedDB
 */
export async function getStoredDirectoryHandle() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[Disk Storage] Could not read stored folder handle:', err);
    return null;
  }
}

/**
 * Persist Directory Handle in IndexedDB
 */
export async function saveStoredDirectoryHandle(handle) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, HANDLE_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[Disk Storage] Could not save folder handle:', err);
    return false;
  }
}

/**
 * Remove saved Directory Handle from IndexedDB
 */
export async function clearStoredDirectoryHandle() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(HANDLE_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[Disk Storage] Could not remove folder handle:', err);
    return false;
  }
}

/**
 * Verify or request readwrite permission on a directory handle
 */
export async function verifyPermission(dirHandle, readWrite = true) {
  if (!dirHandle) return false;
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  try {
    if ((await dirHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await dirHandle.requestPermission(options)) === 'granted') {
      return true;
    }
  } catch (err) {
    console.warn('[Disk Storage] Permission verification failed:', err);
  }
  return false;
}

/**
 * Ask client to select a local folder via the native operating system folder chooser
 */
export async function selectLocalFolder() {
  if (!isFileSystemAccessSupported()) {
    throw new Error('Native folder picker is not supported in this browser. Please use Chrome, Edge, or Opera.');
  }

  // Open native OS folder selector
  const dirHandle = await window.showDirectoryPicker({
    id: 'gatepost_chats_dir',
    mode: 'readwrite',
    startIn: 'documents'
  });

  if (dirHandle) {
    await saveStoredDirectoryHandle(dirHandle);
    localStorage.setItem('gatepost_disk_folder_name', dirHandle.name);
    localStorage.setItem('gatepost_disk_autosave', 'true');
  }

  return dirHandle;
}

/**
 * Generate sanitized filename from chat title & ID
 */
function getSafeBaseName(chat, chatId) {
  const rawTitle = (chat?.title || 'conversation').trim();
  const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').slice(0, 35) || 'chat';
  const cleanId = String(chatId || chat?._id || chat?.id || Date.now()).slice(-8);
  return `${safeTitle}_${cleanId}`;
}

/**
 * Format chat conversation into clean, human-readable Markdown
 */
export function formatChatMarkdown(chat, messages = []) {
  const title = chat?.title || 'Conversation';
  const createdDate = chat?.createdAt ? new Date(chat.createdAt).toLocaleString() : new Date().toLocaleString();
  
  let md = `# GatePost AI — ${title}\n`;
  md += `**Date:** ${createdDate}\n`;
  md += `**Total Messages:** ${messages.length}\n`;
  md += `**Privacy Guarantee:** Zero server disk storage. Saved on local client disk.\n\n`;
  md += `---\n\n`;

  messages.forEach((msg, idx) => {
    const isUser = msg.role === 'user';
    const roleLabel = isUser ? '👤 User' : '🤖 GatePost AI';
    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : '';
    const type = msg.message_type && msg.message_type !== 'text' ? ` [${msg.message_type}]` : '';

    md += `### ${roleLabel}${type} ${time ? `(${time})` : ''}\n\n`;
    md += `${msg.content_text || ''}\n\n`;
    if (idx < messages.length - 1) {
      md += `---\n\n`;
    }
  });

  return md;
}

/**
 * Save a specific chat and its messages directly into the chosen on-disk folder
 */
export async function saveChatToDisk(dirHandle, chat, messages = []) {
  if (!dirHandle) return { success: false, error: 'No folder handle provided' };
  
  const hasPerm = await verifyPermission(dirHandle, true);
  if (!hasPerm) {
    return { success: false, error: 'Write permission not granted by user' };
  }

  try {
    const chatId = chat?._id || chat?.id || 'session';
    const baseName = getSafeBaseName(chat, chatId);

    // 1. Write Human-Readable Markdown file
    const mdContent = formatChatMarkdown(chat, messages);
    const mdFileHandle = await dirHandle.getFileHandle(`${baseName}.md`, { create: true });
    const mdWritable = await mdFileHandle.createWritable();
    await mdWritable.write(mdContent);
    await mdWritable.close();

    // 2. Write Complete Raw JSON file (with metadata)
    const jsonPayload = JSON.stringify({
      schema_version: '1.0',
      exported_at: new Date().toISOString(),
      chat: {
        id: chatId,
        title: chat?.title || 'Untitled',
        createdAt: chat?.createdAt || new Date().toISOString(),
        updatedAt: chat?.updatedAt || new Date().toISOString()
      },
      messages: messages.map((m) => ({
        id: m._id || m.id,
        role: m.role,
        content: m.content_text,
        type: m.message_type || 'text',
        timestamp: m.createdAt
      }))
    }, null, 2);

    const jsonFileHandle = await dirHandle.getFileHandle(`${baseName}.json`, { create: true });
    const jsonWritable = await jsonFileHandle.createWritable();
    await jsonWritable.write(jsonPayload);
    await jsonWritable.close();

    return {
      success: true,
      folderName: dirHandle.name,
      savedFiles: [`${baseName}.md`, `${baseName}.json`],
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[Disk Storage] Error saving chat to folder:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fallback: Trigger browser file download if DirectoryPicker is not available
 */
export function downloadChatFallback(chat, messages = [], format = 'markdown') {
  const chatId = chat?._id || chat?.id || 'session';
  const baseName = getSafeBaseName(chat, chatId);

  let blob;
  let fileName;

  if (format === 'json') {
    const content = JSON.stringify({ chat, messages }, null, 2);
    blob = new Blob([content], { type: 'application/json' });
    fileName = `${baseName}.json`;
  } else {
    const content = formatChatMarkdown(chat, messages);
    blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    fileName = `${baseName}.md`;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
