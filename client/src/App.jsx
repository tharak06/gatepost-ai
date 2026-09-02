import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Plus,
  MessageSquare,
  Trash2,
  Image as ImageIcon,
  FileText,
  Send,
  Cloud,
  CloudUpload,
  User as UserIcon,
  LogOut,
  Shield,
  CheckCircle2,
  Menu,
  X,
  ShieldCheck,
  LayoutDashboard,
  ArrowRight,
  Zap,
  Lock
} from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import OrbStage from './components/OrbStage';
import CircuitSvg from './components/CircuitSvg';
import TaskCard from './components/cards/TaskCard';
import WorkflowCard from './components/cards/WorkflowCard';
import AnalyticsCard from './components/cards/AnalyticsCard';
import InsightsCard from './components/cards/InsightsCard';
import FeaturesSection from './components/sections/FeaturesSection';
import SolutionsSection from './components/sections/SolutionsSection';
import ResourcesSection from './components/sections/ResourcesSection';
import AboutFooterSection from './components/sections/AboutFooterSection';
import AuthModal from './components/AuthModal';
import CloudVaultModal from './components/CloudVaultModal';

export default function App() {
  // Current view: 'network' (First Screen) | 'chat' (Full-screen AI Chat)
  const [currentView, setCurrentView] = useState('network');

  // Auth state — NO guest auto-login: requires actual login
  const [token, setToken] = useState(localStorage.getItem('gatepost_token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('');
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  // Network Hub Data States
  const [tasks, setTasks] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [growthMetric, setGrowthMetric] = useState('+60%');
  const [insights, setInsights] = useState([]);

  // Chat & Navigation state
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saveToCloud, setSaveToCloud] = useState(false);

  // Refs
  const dialogEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Fetch Hub Data & Validate Token on mount
  useEffect(() => {
    // 1. Fetch Hub Data
    const fetchHubData = async () => {
      try {
        const [taskRes, wfRes, anaRes, insRes] = await Promise.allSettled([
          fetch('/api/tasks').then((r) => r.json()),
          fetch('/api/workflows').then((r) => r.json()),
          fetch('/api/analytics').then((r) => r.json()),
          fetch('/api/insights').then((r) => r.json())
        ]);

        if (taskRes.status === 'fulfilled' && taskRes.value?.data) setTasks(taskRes.value.data);
        if (wfRes.status === 'fulfilled' && wfRes.value?.data) setWorkflows(wfRes.value.data);
        if (anaRes.status === 'fulfilled' && anaRes.value?.data) {
          setAnalytics(anaRes.value.data);
          if (anaRes.value.growth) setGrowthMetric(anaRes.value.growth);
        }
        if (insRes.status === 'fulfilled' && insRes.value?.data) setInsights(insRes.value.data);
      } catch (err) {
        console.warn('Using offline fallback for Hub data', err);
      }
    };
    fetchHubData();

    // 2. Check if logged in
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            loadChats(token);
          } else {
            // Invalid/expired token
            handleLogout();
          }
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, []);

  // Require Login Handler: Transitions to chat if logged in, opens auth modal if not!
  const handleStartChat = () => {
    if (token && currentUser) {
      setCurrentView('chat');
      if (chats.length === 0) {
        createNewChat(token);
      }
    } else {
      setAuthPromptMessage('Please sign in with your mobile number or Google account to start chatting.');
      setIsAuthOpen(true);
    }
  };

  // Auth Success callback
  const handleLoginSuccess = (user, authToken) => {
    setCurrentUser(user);
    setToken(authToken);
    localStorage.setItem('gatepost_token', authToken);
    loadChats(authToken);
    setIsAuthOpen(false);
    // Directly enter chat after successful login!
    setCurrentView('chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('gatepost_token');
    setToken('');
    setCurrentUser(null);
    setChats([]);
    setMessages([]);
    setCurrentView('network');
  };

  // Load chats for user
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

  // Create new chat
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

  // Delete chat
  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const remaining = chats.filter((c) => (c._id || c.id) !== chatId);
      setChats(remaining);
      if (currentChatId === chatId) {
        if (remaining.length > 0) {
          const nextId = remaining[0]._id || remaining[0].id;
          setCurrentChatId(nextId);
          loadMessages(nextId, token);
        } else {
          createNewChat(token);
        }
      }
    } catch (err) {
      console.error('Delete chat failed', err);
    }
  };

  // Load messages for chat
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

  // Scroll to bottom
  useEffect(() => {
    if (dialogEndRef.current) {
      dialogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Send message (Only works when logged in)
  const handleSend = async (overrideText) => {
    if (!token || !currentUser) {
      setAuthPromptMessage('Please sign in to send messages.');
      setIsAuthOpen(true);
      return;
    }

    const query = (overrideText || inputText).trim();
    if (!query || !currentChatId) return;

    setIsLoading(true);
    setInputText('');

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

  // Upload Photo
  const handleImageUpload = async (e) => {
    if (!token || !currentUser) {
      setAuthPromptMessage('Please sign in to upload photos.');
      setIsAuthOpen(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file || !currentChatId) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', inputText.trim() || 'Analyze and describe this photo.');
    formData.append('save_to_cloud', saveToCloud ? 'true' : 'false');
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

  // Upload PDF
  const handlePdfUpload = async (e) => {
    if (!token || !currentUser) {
      setAuthPromptMessage('Please sign in to analyze PDF documents.');
      setIsAuthOpen(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file || !currentChatId) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', inputText.trim() || 'Summarize key insights from this document.');
    formData.append('save_to_cloud', saveToCloud ? 'true' : 'false');
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

  // Generate Image
  const handleGenerateImage = async (prompt) => {
    if (!token || !currentUser) {
      setAuthPromptMessage('Please sign in to generate images.');
      setIsAuthOpen(true);
      return;
    }

    if (!prompt || !currentChatId) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/chats/${currentChatId}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ prompt, save_to_cloud: saveToCloud })
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
  };

  // Hub Task Toggle
  const handleToggleTask = async (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId || t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
    try {
      await fetch(`/api/tasks/${taskId}/toggle`, { method: 'PATCH' });
    } catch (e) {
      console.error('Failed to sync task toggle', e);
    }
  };

  // Hub Workflow Trigger
  const handleTriggerWorkflow = async (workflowId) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w._id === workflowId || w.id === workflowId
          ? { ...w, status: w.status === 'active' ? 'completed' : 'active' }
          : w
      )
    );
    try {
      await fetch(`/api/workflows/${workflowId}/trigger`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to trigger workflow', e);
    }
  };

  const hasMessages = messages.length > 0;
  const usernameDisplay = currentUser?.username || 'User';

  return (
    <div className="app-root-wrapper">
      {/* =========================================================================
          SCREEN 1: THE FIRST NETWORK SYSTEM (Boltshift-style Cybernetic Hub)
          ========================================================================= */}
      {currentView === 'network' && (
        <div className="network-system-view">
          {/* Background Atmosphere */}
          <div className="space-bg">
            <div className="space-grid" />
            <div className="ambient-light-beam" />
          </div>

          {/* Navigation Bar */}
          <header className="navbar">
            <div className="brand" onClick={() => setCurrentView('network')}>
              <div className="brand-icon-wrapper">
                <Zap className="brand-icon" fill="#ffffff" />
              </div>
              <div className="brand-name">
                GaTePoSt
              </div>
            </div>

            <ul className="nav-links">
              <li><a className="nav-link" href="#features">Features</a></li>
              <li><a className="nav-link" href="#solutions">Solutions</a></li>
              <li><a className="nav-link" href="#analytics">Analytics</a></li>
              <li><a className="nav-link" href="#about">About</a></li>
            </ul>

            <div className="nav-actions">
              {currentUser ? (
                <div className="nav-user-badge">
                  <span className="user-greeting">Hi, {usernameDisplay}</span>
                  <button className="btn-nav-logout" onClick={handleLogout} title="Log out">
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button
                  className="btn-nav-signin"
                  onClick={() => { setAuthPromptMessage('Sign In to GaTePoSt'); setIsAuthOpen(true); }}
                >
                  Sign in
                </button>
              )}

              <button className="btn-nav-cta" onClick={handleStartChat}>
                <Sparkles size={14} /> Start Chat
              </button>
            </div>
          </header>

          {/* Hero Header */}
          <Hero
            onGetStarted={handleStartChat}
            onSeeInAction={() => {
              const el = document.getElementById('overview');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* Central Interactive Network Stage */}
          <main className="stage-container" id="overview">
            <CircuitSvg />
            <OrbStage
              size={380}
              onClick={handleStartChat}
            />

            <div className="cards-layout-grid">
              <TaskCard
                tasks={tasks}
                onToggleTask={handleToggleTask}
              />
              <WorkflowCard
                workflows={workflows}
                onTriggerWorkflow={handleTriggerWorkflow}
              />
              <AnalyticsCard
                analytics={analytics}
                growth={growthMetric}
              />
              <InsightsCard
                insights={insights}
              />
            </div>
          </main>

          {/* Features, Solutions, Live Telemetry & About Footer */}
          <FeaturesSection onTryFeature={handleStartChat} />
          <SolutionsSection onOpenAssistant={handleStartChat} />
          <AboutFooterSection />
        </div>
      )}

      {/* =========================================================================
          SCREEN 2: FULL-SCREEN GATEPOST AI CHAT (Google Gemini Style)
          ========================================================================= */}
      {currentView === 'chat' && (
        <div className="gemini-app-layout">
          {/* Left Sidebar */}
          <aside className={`gemini-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-top-header">
              <div className="sidebar-brand" onClick={() => setCurrentView('network')} title="Back to Network Hub" style={{ cursor: 'pointer' }}>
                <div className="brand-sparkle-box">
                  <Sparkles size={18} color="#00f0ff" />
                </div>
                <span className="brand-title-text">GaTePoSt</span>
              </div>
              <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu size={18} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="sidebar-new-chat-wrap">
              <button className="gemini-new-chat-btn" onClick={() => createNewChat(token)}>
                <Plus size={18} />
                <span>New chat</span>
              </button>
            </div>

            {/* Switch Back to Network Hub */}
            <div className="sidebar-vault-shortcut">
              <button className="sidebar-network-btn" onClick={() => setCurrentView('network')}>
                <LayoutDashboard size={15} color="#00f0ff" />
                <span>Network Hub</span>
              </button>
            </div>

            {/* Cloud Storage Vault Shortcut */}
            <div className="sidebar-vault-shortcut" style={{ paddingTop: 0 }}>
              <button className="sidebar-vault-btn" onClick={() => setIsVaultOpen(true)}>
                <Cloud size={15} color="#38bdf8" />
                <span>Cloud Storage Vault</span>
              </button>
            </div>

            {/* Recent Chats Section */}
            <div className="sidebar-chats-container">
              <span className="sidebar-section-heading">Recent</span>
              <div className="sidebar-chats-list">
                {chats.map((chat) => {
                  const id = chat._id || chat.id;
                  const isActive = id === currentChatId;
                  return (
                    <div
                      key={id}
                      className={`sidebar-chat-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentChatId(id);
                        loadMessages(id, token);
                      }}
                    >
                      <MessageSquare size={15} className="chat-item-icon" />
                      <span className="chat-item-title">{chat.title || 'Conversation'}</span>
                      <button
                        className="chat-delete-btn"
                        onClick={(e) => handleDeleteChat(e, id)}
                        title="Delete conversation"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* User Account at Bottom */}
            <div className="sidebar-footer-user">
              {currentUser ? (
                <div className="user-profile-card">
                  <div className="user-avatar-circle">
                    {usernameDisplay.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-meta-info">
                    <span className="user-name">{usernameDisplay}</span>
                    <span className="user-email">{currentUser.email || currentUser.phone || 'Active'}</span>
                  </div>
                  <button className="logout-icon-btn" onClick={handleLogout} title="Log Out">
                    <LogOut size={15} />
                  </button>
                </div>
              ) : (
                <button className="sidebar-login-prompt-btn" onClick={() => { setAuthPromptMessage('Sign In'); setIsAuthOpen(true); }}>
                  <UserIcon size={16} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </aside>

          {/* Main Chat Canvas */}
          <main className="gemini-main-canvas">
            <header className="gemini-topbar">
              <div className="topbar-left">
                {!sidebarOpen && (
                  <button className="open-sidebar-btn" onClick={() => setSidebarOpen(true)} title="Open sidebar">
                    <Menu size={18} />
                  </button>
                )}
                <div className="model-selector-pill">
                  <span className="model-name">GaTePoSt</span>
                  <span className="model-badge">Online</span>
                </div>
              </div>

              <div className="topbar-right">
                <button className="vault-shortcut-pill" onClick={() => setCurrentView('network')}>
                  <LayoutDashboard size={14} color="#00f0ff" />
                  <span>Network Hub</span>
                </button>
                <button className="vault-shortcut-pill" onClick={() => setIsVaultOpen(true)}>
                  <Cloud size={14} color="#38bdf8" />
                  <span>Cloud Vault</span>
                </button>
                {currentUser && (
                  <div className="user-avatar-circle" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                    {usernameDisplay.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </header>

            {/* Chat Stream */}
            <div className="gemini-chat-stream">
              {!hasMessages && (
                <div className="gemini-welcome-container">
                  <h1 className="gemini-greeting-title">
                    Hello, <span className="gradient-text">{usernameDisplay}</span>
                  </h1>
                  <h2 className="gemini-greeting-sub">How can I help you today?</h2>

                  <div className="gemini-suggestion-grid">
                    <div className="suggestion-card" onClick={() => imageInputRef.current?.click()}>
                      <p>Upload a photo for instant in-depth analysis</p>
                      <div className="card-icon-bubble">
                        <ImageIcon size={18} color="#00f0ff" />
                      </div>
                    </div>

                    <div className="suggestion-card" onClick={() => pdfInputRef.current?.click()}>
                      <p>Upload a PDF document to summarize key findings</p>
                      <div className="card-icon-bubble">
                        <FileText size={18} color="#38bdf8" />
                      </div>
                    </div>

                    <div
                      className="suggestion-card"
                      onClick={() => handleGenerateImage("A futuristic cybernetic gateway with neon cyan plasma glow")}
                    >
                      <p>Generate a high-resolution cybernetic concept image</p>
                      <div className="card-icon-bubble">
                        <Sparkles size={18} color="#818cf8" />
                      </div>
                    </div>

                    <div
                      className="suggestion-card"
                      onClick={() => handleSend("Who created you?")}
                    >
                      <p>Ask who created and architected GaTePoSt</p>
                      <div className="card-icon-bubble">
                        <MessageSquare size={18} color="#34d399" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hasMessages && (
                <div className="messages-thread-wrapper instagram-style">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    return isUser ? (
                      /* USER MESSAGE: Aligned to the RIGHT (Instagram Style) */
                      <div key={msg._id || index} className="insta-msg-row user-side">
                        <div className="insta-bubble user-bubble">
                          <div className="insta-bubble-text">{msg.content_text}</div>
                        </div>
                      </div>
                    ) : (
                      /* GaTePoSt MESSAGE: Aligned to the LEFT (Instagram Style) */
                      <div key={msg._id || index} className="insta-msg-row ai-side">
                        <div className="insta-avatar-ai" title="GaTePoSt">
                          <Sparkles size={14} color="#00f0ff" />
                        </div>
                        <div className="insta-bubble ai-bubble">
                          {msg.message_type && msg.message_type !== 'text' && (
                            <div className="insta-media-badge">
                              {msg.content_text?.includes('Saved to Cloud') ? (
                                <><CloudUpload size={11} color="#34d399" /> Saved in Cloud Vault</>
                              ) : (
                                <><ShieldCheck size={11} color="#00f0ff" /> In-Memory</>
                              )}
                            </div>
                          )}

                          <div className="insta-bubble-text">{msg.content_text}</div>

                          {/* Render Image Previews (Generated or Uploaded) */}
                          {msg.image_data_url && (
                            <div className="chat-image-container">
                              <img src={msg.image_data_url} alt="Attached Media" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="insta-msg-row ai-side">
                      <div className="insta-avatar-ai pulse">
                        <Sparkles size={14} color="#00f0ff" />
                      </div>
                      <div className="insta-bubble ai-bubble loading-bubble">
                        <div className="thinking-indicator">
                          <span className="dot" />
                          <span className="dot" />
                          <span className="dot" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={dialogEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Input Area */}
            <footer className="gemini-input-footer">
              <input
                type="file"
                ref={imageInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageUpload}
              />
              <input
                type="file"
                ref={pdfInputRef}
                style={{ display: 'none' }}
                accept="application/pdf"
                onChange={handlePdfUpload}
              />

              <div className="input-options-bar">
                <button
                  className={`cloud-toggle-pill ${saveToCloud ? 'active' : ''}`}
                  onClick={() => setSaveToCloud(!saveToCloud)}
                  title="Toggle permanent cloud storage vs in-memory processing"
                >
                  {saveToCloud ? <CloudUpload size={14} color="#34d399" /> : <Shield size={14} color="#00f0ff" />}
                  <span>{saveToCloud ? '☁️ Save to Cloud Vault: ON (Permanent)' : '🔒 In-Memory Zero-Disk: ON'}</span>
                </button>
              </div>

              <div className="gemini-prompt-box">
                <div className="prompt-left-actions">
                  <button
                    className="pill-action-btn"
                    onClick={() => imageInputRef.current?.click()}
                    title="Upload Photo for AI analysis"
                  >
                    <ImageIcon size={18} />
                  </button>
                  <button
                    className="pill-action-btn"
                    onClick={() => pdfInputRef.current?.click()}
                    title="Upload PDF Document for AI analysis"
                  >
                    <FileText size={18} />
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="gemini-textarea"
                  placeholder="Ask GaTePoSt..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />

                <div className="prompt-right-actions">
                  <button
                    className={`gemini-send-btn ${inputText.trim() ? 'ready' : ''}`}
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || isLoading}
                    title="Send"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>

              <p className="gemini-disclaimer">
                GaTePoSt can evaluate text, photos, and PDFs. Uploaded media is processed in-memory and only saved when "Save to Cloud" is active.
              </p>
            </footer>
          </main>
        </div>
      )}

      {/* Auth Modal (Mobile OTP & Gmail) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        titleMessage={authPromptMessage}
      />

      {/* Cloud Vault Modal */}
      <CloudVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        token={token}
      />
    </div>
  );
}
