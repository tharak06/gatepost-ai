import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Image as ImageIcon, FileText, Sparkles, Plus, ShieldCheck, Lock, RefreshCw } from 'lucide-react';
import OrbStage from './OrbStage';

export default function AssistantModal({ isOpen, onClose }) {
  const [token, setToken] = useState(localStorage.getItem('gatepost_token') || '');
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imageGenMode, setImageGenMode] = useState(false);

  const dialogEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // Initialize or fetch Guest Auth Token on load
  useEffect(() => {
    const initAuth = async () => {
      let activeToken = token;
      if (!activeToken) {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'guest', password: 'guest123' })
          });
          const data = await res.json();
          if (data.token) {
            activeToken = data.token;
            setToken(data.token);
            localStorage.setItem('gatepost_token', data.token);
          }
        } catch (e) {
          console.warn('Could not auto-login guest', e);
        }
      }

      if (activeToken) {
        loadChats(activeToken);
      }
    };

    if (isOpen) {
      initAuth();
    }
  }, [isOpen]);

  // Load User Chats
  const loadChats = async (authToken) => {
    try {
      const res = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${authToken || token}` }
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setChats(data.data);
        const activeId = data.data[0]._id || data.data[0].id;
        setCurrentChatId(activeId);
        loadMessages(activeId, authToken || token);
      } else {
        createNewChat(authToken || token);
      }
    } catch (e) {
      console.warn('Failed to load chats', e);
    }
  };

  // Create New Chat
  const createNewChat = async (authToken) => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken || token}`
        },
        body: JSON.stringify({ title: `Session #${chats.length + 1}` })
      });
      const data = await res.json();
      if (data.success) {
        const newChat = data.data;
        setChats((prev) => [newChat, ...prev]);
        const id = newChat._id || newChat.id;
        setCurrentChatId(id);
        setMessages([]);
      }
    } catch (e) {
      console.warn('Could not create chat', e);
    }
  };

  // Load Messages for Chat
  const loadMessages = async (chatId, authToken) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${authToken || token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (e) {
      console.warn('Failed to load messages', e);
    }
  };

  // Auto-scroll conversation
  useEffect(() => {
    if (dialogEndRef.current) {
      dialogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Voice Recognition (Silent input - speaking feature removed per user request)
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsRecording(!isRecording);
      if (!isRecording) {
        setTimeout(() => {
          setInputText("Summarize active directives");
          setIsRecording(false);
        }, 1500);
      }
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSend(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  // Send Text or ImageGen (Silent - no speaking out)
  const handleSend = async (overrideText) => {
    const query = (overrideText || inputText).trim();
    if (!query || !currentChatId) return;

    setIsLoading(true);
    setInputText('');

    if (imageGenMode) {
      setImageGenMode(false);
      try {
        const res = await fetch(`/api/chats/${currentChatId}/generate-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ prompt: query })
        });
        const data = await res.json();
        if (data.success && data.data) {
          setMessages((prev) => [...prev, ...data.data]);
        }
      } catch (e) {
        console.error('Image gen failed', e);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const res = await fetch(`/api/chats/${currentChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content_text: query })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages((prev) => [...prev, ...data.data]);
      }
    } catch (e) {
      console.error('Send message failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  // In-Memory Image Upload
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentChatId) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', inputText.trim() || 'Describe and analyze this image.');
    setInputText('');

    try {
      const res = await fetch(`/api/chats/${currentChatId}/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages((prev) => [...prev, ...data.data]);
      }
    } catch (err) {
      console.error('Image upload failed', err);
    } finally {
      setIsLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // In-Memory PDF Upload
  const handlePdfFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentChatId) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', inputText.trim() || 'Summarize and extract key insights from this document.');
    setInputText('');

    try {
      const res = await fetch(`/api/chats/${currentChatId}/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages((prev) => [...prev, ...data.data]);
      }
    } catch (err) {
      console.error('PDF upload failed', err);
    } finally {
      setIsLoading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const hasMessages = messages.length > 0;

  return (
    <div className={`assistant-overlay-backdrop ${isOpen ? 'active' : ''}`} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="phone-mockup-frame">
        {/* Dynamic Island Notch */}
        <div className="phone-island">
          <div className="island-camera" />
          <div className="island-sensor" />
        </div>

        {/* Header Bar with Sessions and Close */}
        <div className="assistant-modal-topbar">
          <div className="topbar-left">
            <button className="new-chat-pill-btn" onClick={() => createNewChat(token)} title="Start new session">
              <Plus size={12} /> New
            </button>
            <span className="privacy-badge-pill" title="All media processed strictly in memory">
              <Lock size={10} /> Zero-Disk RAM
            </span>
          </div>
          <button className="assistant-close-btn" onClick={onClose} title="Close Assistant">
            <X size={16} />
          </button>
        </div>

        {/* Body Content Container */}
        <div className="assistant-view-content">
          {/* If no conversation yet: Large Hero Display matching Image 2 */}
          {!hasMessages && (
            <div className="assistant-welcome-stage">
              <div className="assistant-orb-wrapper">
                <OrbStage size={160} />
              </div>
              <div className="assistant-typography">
                <p className="assistant-greeting-user">Hello Tharakeswar</p>
                <h2 className="assistant-prompt-headline">How can I help<br />you today?</h2>
              </div>
            </div>
          )}

          {/* If conversation active: Compact Top Orb & Full Height Scrollable Chat Area */}
          {hasMessages && (
            <div className="assistant-compact-header">
              <div className="compact-orb-wrap">
                <OrbStage size={48} />
              </div>
              <div>
                <h4 className="compact-title">GatePost AI</h4>
                <p className="compact-status">Online • Ephemeral In-Memory Active</p>
              </div>
            </div>
          )}

          {/* Conversation Log (Smooth, non-overlapping scrolling) */}
          <div className="assistant-dialog-log">
            {messages.map((msg, index) => {
              const isEphemeral = msg.message_type && msg.message_type !== 'text';
              return (
                <div
                  key={msg._id || index}
                  className={`bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'} ${isEphemeral ? 'ephemeral' : ''}`}
                >
                  {isEphemeral && (
                    <div className="ephemeral-tag">
                      <ShieldCheck size={12} />
                      <span>Ephemeral Turn — Zero-Disk In-Memory</span>
                    </div>
                  )}

                  <div className="bubble-text">{msg.content_text}</div>

                  {msg.image_data_url && (
                    <div className="generated-image-preview">
                      <img src={msg.image_data_url} alt="Generated Ephemeral Media" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="bubble bubble-ai loading-bubble">
                <RefreshCw size={14} className="spin-icon" /> GatePost AI processing in memory...
              </div>
            )}
            <div ref={dialogEndRef} />
          </div>

          {/* Bottom Controls Bar (Permanently Anchored at Bottom) */}
          <div className="assistant-footer-bar">
            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={imageInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleImageFileChange}
            />
            <input
              type="file"
              ref={pdfInputRef}
              style={{ display: 'none' }}
              accept="application/pdf"
              onChange={handlePdfFileChange}
            />

            {/* Prompt Bar */}
            <div className="assistant-prompt-bar">
              <div className="media-actions-toolbar">
                <button
                  className="media-action-btn"
                  title="Upload Image (Processed in RAM, zero disk write)"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon size={15} />
                </button>
                <button
                  className="media-action-btn"
                  title="Upload PDF (Extracted in RAM, zero disk write)"
                  onClick={() => pdfInputRef.current?.click()}
                >
                  <FileText size={15} />
                </button>
                <button
                  className={`media-action-btn ${imageGenMode ? 'active' : ''}`}
                  title="Toggle Image Generation Mode"
                  onClick={() => setImageGenMode(!imageGenMode)}
                >
                  <Sparkles size={15} color={imageGenMode ? '#00f0ff' : 'currentColor'} />
                </button>
              </div>

              <input
                type="text"
                className="assistant-input-field"
                placeholder={imageGenMode ? "Describe image to generate..." : "Ask anything..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                autoFocus
              />

              {inputText.trim() ? (
                <button
                  className="waveform-mic-btn"
                  onClick={() => handleSend()}
                  title="Send message"
                >
                  <Send size={17} color="#00f0ff" />
                </button>
              ) : (
                <button
                  className={`waveform-mic-btn ${isRecording ? 'recording' : ''}`}
                  onClick={toggleVoice}
                  title={isRecording ? "Listening..." : "Tap to speak"}
                >
                  <span className="wave-bar" />
                  <span className="wave-bar" />
                  <span className="wave-bar" />
                  <span className="wave-bar" />
                  <span className="wave-bar" />
                </button>
              )}
            </div>

            {/* Quick Action Chips */}
            <div className="quick-prompt-chips">
              <button className="chip-btn" onClick={() => handleSend("Summarize active directives")}>
                ⚡ Directives
              </button>
              <button className="chip-btn" onClick={() => { setImageGenMode(true); setInputText("Futuristic AI security portal with cyan neon glow"); }}>
                🎨 Generate Image
              </button>
              <button className="chip-btn" onClick={() => imageInputRef.current?.click()}>
                📷 Analyze Image
              </button>
              <button className="chip-btn" onClick={() => pdfInputRef.current?.click()}>
                📄 Inspect PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
