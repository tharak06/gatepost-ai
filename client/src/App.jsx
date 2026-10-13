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
  Lock,
  Info,
  Cpu,
  ChevronDown,
  Check,
  Pin,
  Sun,
  Moon,
  Search,
  Copy,
  RotateCw,
  Share2,
  Bookmark,
  MoreHorizontal,
  PanelRight,
  Settings,
  Mic,
  Bold,
  Italic,
  Code,
  Strikethrough,
  ExternalLink,
  BookOpen,
  Edit2
} from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import OrbStage from './components/OrbStage';
import CircuitSvg from './components/CircuitSvg';
import TaskCard from './components/cards/TaskCard';
import WorkflowCard from './components/cards/WorkflowCard';
import AnalyticsCard from './components/cards/AnalyticsCard';
import InsightsCard from './components/cards/InsightsCard';
import AboutFooterSection from './components/sections/AboutFooterSection';
import AuthModal from './components/AuthModal';
import CloudVaultModal from './components/CloudVaultModal';
import AboutModal from './components/AboutModal';
import ModelSelectorModal from './components/ModelSelectorModal';
import BrandLogo from './components/BrandLogo';

export default function App() {
  // Current view: 'network' (First Screen) | 'chat' (macOS Luxury AI Workspace)
  const [currentView, setCurrentView] = useState('network');

  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState(() => localStorage.getItem('gatepost_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gatepost_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Auth state — Preserved in localStorage so refreshing NEVER logs out
  const [token, setToken] = useState(localStorage.getItem('gatepost_token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gatepost_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('');
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [activeModel, setActiveModel] = useState(() => localStorage.getItem('gatepost_selected_model') || 'llama3.2');
  const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem('gatepost_selected_provider') || 'ollama');
  const [ollamaOnline, setOllamaOnline] = useState(true);
  const modelDropdownRef = useRef(null);

  // Quick Model Options
  const quickModelOptions = [
    { id: 'llama3.2', name: 'LLaMA 3.2', desc: '3B • Ultra-fast, low RAM', provider: 'ollama' },
    { id: 'llama3', name: 'LLaMA 3', desc: '8B • Deep reasoning & creative', provider: 'ollama' },
    { id: 'mistral', name: 'Mistral', desc: '7B • Instruction & coding', provider: 'ollama' },
    { id: 'phi3', name: 'Phi-3 Mini', desc: '3.8B • Fast & lightweight', provider: 'ollama' },
    { id: 'deepseek-r1', name: 'DeepSeek-R1', desc: 'Chain-of-thought reasoning', provider: 'ollama' },
    { id: 'qwen2.5', name: 'Qwen 2.5', desc: '7B • Multilingual & code', provider: 'ollama' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Google Cloud multimodal', provider: 'gemini' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'OpenAI intelligence', provider: 'openai' }
  ];

  // Close fast model dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [saveToCloud, setSaveToCloud] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [copiedToast, setCopiedToast] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitleText, setEditingTitleText] = useState('');

  // Refs
  const dialogEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const textareaRef = useRef(null);
  const searchInputRef = useRef(null);

  const [telemetry, setTelemetry] = useState(null);
  const [userTelemetry, setUserTelemetry] = useState(null);

  // Fetch real-time per-user analytics telemetry
  const fetchUserAnalytics = async (authToken) => {
    if (!authToken) {
      setUserTelemetry(null);
      return;
    }
    try {
      const res = await fetch('/api/chats/user/analytics', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUserTelemetry(json.data);
        }
      }
    } catch (err) {
      console.warn('[User Analytics Fetch Notice]:', err);
    }
  };

  // Fetch Hub Data & Validate Token on mount
  useEffect(() => {
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
          if (anaRes.value.telemetry) setTelemetry(anaRes.value.telemetry);
        }
        if (insRes.status === 'fulfilled' && insRes.value?.data) setInsights(insRes.value.data);
      } catch (err) {
        console.warn('Using offline fallback for Hub data', err);
      }
    };

    fetchHubData();
    const telemetryInterval = setInterval(fetchHubData, 60000);

    // Validate token on mount
    if (token) {
      loadChats(token, false);
      fetchUserAnalytics(token);

      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => {
          if (r.status === 401) {
            handleLogout();
            return null;
          }
          return r.json();
        })
        .then((data) => {
          if (data && data.success && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('gatepost_user', JSON.stringify(data.user));
          }
        })
        .catch((err) => {
          console.warn('Network issue verifying session, preserving cached user:', err);
        });
    }

    // Fetch active model from API
    fetch('/api/models')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOllamaOnline(d.ollamaOnline);
          if (d.activeModel) setActiveModel(d.activeModel);
          if (d.activeProvider) setActiveProvider(d.activeProvider);
        }
      })
      .catch(() => {});

    return () => clearInterval(telemetryInterval);
  }, []);

  // Real-time synchronization when viewing dashboard
  useEffect(() => {
    if (currentView === 'network' && token) {
      fetchUserAnalytics(token);
      loadChats(token, false);
    }
  }, [currentView, token]);

  // Keyboard shortcuts (⌘K for chat search, ⌘1 Chats, ⌘2 Vault, ⌘3 Hub)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setCurrentView('chat');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setIsVaultOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        setCurrentView('network');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleModelChange = async (modelId, provider = 'ollama') => {
    setActiveModel(modelId);
    setActiveProvider(provider);
    localStorage.setItem('gatepost_selected_model', modelId);
    localStorage.setItem('gatepost_selected_provider', provider);
    try {
      await fetch('/api/models/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, provider })
      });
    } catch (err) {
      console.warn('Could not sync active model to backend:', err);
    }
  };

  // Require Login Handler: Starts fresh new chat session on open!
  const handleStartChat = () => {
    if (token && currentUser) {
      setCurrentView('chat');
      createNewChat(token);
    } else {
      setAuthPromptMessage('Please sign in with your email or Google account to start chatting.');
      setIsAuthOpen(true);
    }
  };

  // Auth Success callback
  const handleLoginSuccess = (user, authToken) => {
    setCurrentUser(user);
    setToken(authToken);
    localStorage.setItem('gatepost_token', authToken);
    localStorage.setItem('gatepost_user', JSON.stringify(user));
    loadChats(authToken, false);
    fetchUserAnalytics(authToken);
    setIsAuthOpen(false);
    createNewChat(authToken);
    setCurrentView('chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('gatepost_token');
    localStorage.removeItem('gatepost_user');
    setToken('');
    setCurrentUser(null);
    setUserTelemetry(null);
    setChats([]);
    setMessages([]);
    setCurrentView('network');
  };

  // Load chats for user
  const loadChats = async (authToken, autoOpenNewest = false) => {
    try {
      const res = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${authToken || token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setChats(data.data);
        if (autoOpenNewest && data.data.length > 0) {
          const activeId = data.data[0]._id || data.data[0].id;
          setCurrentChatId(activeId);
          loadMessages(activeId, authToken || token);
        }
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
        body: JSON.stringify({ title: 'New Conversation' })
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

  // Rename chat handlers
  const handleStartRename = (e, chat) => {
    if (e) e.stopPropagation();
    const id = chat._id || chat.id;
    setEditingChatId(id);
    setEditingTitleText(chat.title || 'New Conversation');
  };

  const handleSaveRename = async (e, chatId) => {
    if (e) e.stopPropagation();
    const clean = (editingTitleText || '').trim();
    if (!clean) {
      setEditingChatId(null);
      return;
    }
    // Optimistic state update
    setChats((prev) =>
      prev.map((c) =>
        ((c._id || c.id) === chatId ? { ...c, title: clean, customTitle: true } : c)
      )
    );
    setEditingChatId(null);
    try {
      await fetch(`/api/chats/${chatId}/rename`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: clean })
      });
    } catch (err) {
      console.warn('Could not save renamed title:', err);
    }
  };

  const handleCancelRename = (e) => {
    if (e) e.stopPropagation();
    setEditingChatId(null);
    setEditingTitleText('');
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

  // ChatGPT-Style Chat Pinning Handler (Toggles pin status with instant optimistic update)
  const handleTogglePin = async (e, chatId) => {
    e.stopPropagation();
    setChats((prev) =>
      prev.map((c) => {
        const id = c._id || c.id;
        if (id === chatId) {
          return { ...c, pinned: !c.pinned };
        }
        return c;
      })
    );

    try {
      const res = await fetch(`/api/chats/${chatId}/pin`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setChats((prev) =>
          prev.map((c) => {
            const id = c._id || c.id;
            if (id === chatId) {
              return { ...c, pinned: data.pinned };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.error('Failed to toggle pin', err);
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

  // Send message
  const handleSend = async (overrideText) => {
    if (!token || !currentUser) {
      setAuthPromptMessage('Please sign in to send messages.');
      setIsAuthOpen(true);
      return;
    }

    const query = (overrideText || inputText).trim();
    if (!query) return;

    setIsLoading(true);
    setInputText('');

    let targetChatId = currentChatId;

    if (!targetChatId) {
      if (chats.length > 0) {
        targetChatId = chats[0]._id || chats[0].id;
        setCurrentChatId(targetChatId);
      } else {
        try {
          const res = await fetch('/api/chats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ title: 'New Conversation' })
          });
          const cData = await res.json();
          if (cData.success && cData.data) {
            targetChatId = cData.data._id || cData.data.id;
            setChats([cData.data]);
            setCurrentChatId(targetChatId);
          }
        } catch (createErr) {
          console.error('Auto-chat creation error', createErr);
        }
      }
    }

    if (!targetChatId) {
      setIsLoading(false);
      return;
    }

    const tempUserMsg = {
      _id: `temp_${Date.now()}`,
      chat_id: targetChatId,
      role: 'user',
      content_text: query,
      message_type: 'text',
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/chats/${targetChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content_text: query,
          model: activeModel,
          provider: activeProvider
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages((prev) => [
          ...prev.filter((m) => m._id !== tempUserMsg._id),
          ...data.data
        ]);
        if (data.updated_chat_title) {
          setChats((prev) =>
            prev.map((c) =>
              (c._id === targetChatId || c.id === targetChatId)
                ? { ...c, title: data.updated_chat_title }
                : c
            )
          );
        }
      } else {
        throw new Error(data.error || 'AI server response error');
      }
    } catch (e) {
      console.error('Send message failed', e);
      setMessages((prev) => [
        ...prev,
        {
          _id: `err_${Date.now()}`,
          chat_id: targetChatId,
          role: 'assistant',
          content_text: `⚠️ Could not reach AI service: ${e.message || 'Please check your connection.'}`,
          message_type: 'text',
          createdAt: new Date().toISOString()
        }
      ]);
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

  // Copy Message helper
  const handleCopyMessage = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Share text helper
  const handleShareMessage = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedToast('Response link copied to clipboard!');
    setTimeout(() => setCopiedToast(''), 2200);
  };

  // Format Text in Dock input
  const applyDockFormat = (prefix, suffix = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const nextVal = val.substring(0, start) + replacement + val.substring(end);
    setInputText(nextVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
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

  // Filtered Chats (Search & ChatGPT-Style Pinning)
  const filteredChats = chats.filter((c) =>
    (c.title || 'Conversation').toLowerCase().includes(chatSearchQuery.toLowerCase())
  );
  const pinnedChats = filteredChats.filter((c) => c.pinned);
  const historyChats = filteredChats.filter((c) => !c.pinned);

  const currentChat = chats.find((c) => (c._id || c.id) === currentChatId);
  const currentChatTitle = currentChat?.title || 'New Conversation';

  const hasMessages = messages.length > 0;
  const usernameDisplay = currentUser?.username || 'Alex Ferguson';

  return (
    <div className={`app-root-wrapper theme-${theme}`} data-theme={theme}>
      {/* Toast Notification */}
      {copiedToast && (
        <div className="workspace-toast-pill">
          <CheckCircle2 size={15} color="#10b981" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* =========================================================================
          SCREEN 1: THE FIRST NETWORK SYSTEM (Luxury AI Hub View)
          ========================================================================= */}
      {currentView === 'network' && (
        <div className="network-system-view">
          {/* Ambient Luxury Lighting Atmosphere */}
          <div className="luxury-ambient-bg">
            <div className="luxury-glow-beam" />
            <div className="luxury-glow-beam secondary" />
          </div>

          {/* Luxury Top Navigation Bar */}
          <header className="navbar">
            <BrandLogo size={32} onClick={() => setCurrentView('network')} />

            <ul className="nav-links">
              <li><a className="nav-link" href="#overview">Workspace</a></li>
              <li>
                <button
                  className="nav-link"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    font: 'inherit',
                    color: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  onClick={() => setIsAboutOpen(true)}
                >
                  About
                </button>
              </li>
            </ul>

            <div className="nav-actions">
              {/* THEME TOGGLE BUTTON (☀️ Light / 🌙 Dark) */}
              <button
                className="theme-switch-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                id="theme-toggle-btn"
              >
                {theme === 'light' ? (
                  <>
                    <Moon size={14} className="theme-icon moon" />
                    <span className="theme-text">Dark</span>
                  </>
                ) : (
                  <>
                    <Sun size={14} className="theme-icon sun" />
                    <span className="theme-text">Light</span>
                  </>
                )}
              </button>

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
              userStats={{
                username: usernameDisplay,
                email: currentUser?.email || currentUser?.phone || 'Guest Account',
                isLoggedIn: Boolean(currentUser),
                chatsCount: userTelemetry?.chatsCount ?? chats.length,
                messagesCount: userTelemetry?.promptsSent ?? messages.length,
                imagesCount: userTelemetry?.aiCreations ?? messages.filter(m => m.message_type === 'image_generated').length,
                lastChatTitle: userTelemetry?.lastChatTitle || chats[0]?.title || 'New Session'
              }}
            />

            <div className="cards-layout-grid">
              <TaskCard
                userStats={{
                  username: usernameDisplay,
                  email: currentUser?.email || currentUser?.phone || 'Guest Account',
                  isLoggedIn: Boolean(currentUser),
                  chatsCount: userTelemetry?.chatsCount ?? chats.length,
                  messagesCount: userTelemetry?.promptsSent ?? messages.length,
                  imagesCount: userTelemetry?.aiCreations ?? messages.filter(m => m.message_type === 'image_generated').length,
                  lastChatTitle: userTelemetry?.lastChatTitle || chats[0]?.title || 'New Session'
                }}
                dynamicTasks={userTelemetry?.tasks}
              />
              <WorkflowCard
                chats={chats}
                onSelectChat={(chatId) => {
                  setCurrentChatId(chatId);
                  loadMessages(chatId, token);
                  setCurrentView('chat');
                }}
                onStartNewChat={handleStartChat}
                username={usernameDisplay}
              />
              <AnalyticsCard
                userStats={{
                  username: usernameDisplay,
                  email: currentUser?.email || currentUser?.phone || 'Guest Account',
                  isLoggedIn: Boolean(currentUser),
                  chatsCount: userTelemetry?.chatsCount ?? chats.length,
                  messagesCount: userTelemetry?.promptsSent ?? messages.length,
                  imagesCount: userTelemetry?.aiCreations ?? messages.filter(m => m.message_type === 'image_generated').length,
                  lastChatTitle: userTelemetry?.lastChatTitle || chats[0]?.title || 'New Session'
                }}
                analyticsData={userTelemetry}
              />
              <InsightsCard
                userStats={{
                  username: usernameDisplay,
                  email: currentUser?.email || currentUser?.phone || 'Guest Account',
                  isLoggedIn: Boolean(currentUser),
                  chatsCount: userTelemetry?.chatsCount ?? chats.length,
                  messagesCount: userTelemetry?.promptsSent ?? messages.length,
                  imagesCount: userTelemetry?.aiCreations ?? messages.filter(m => m.message_type === 'image_generated').length,
                  lastChatTitle: userTelemetry?.lastChatTitle || chats[0]?.title || 'New Session'
                }}
                dynamicInsights={userTelemetry?.insights}
              />
            </div>
          </main>

          {/* About Creator Footer */}
          <AboutFooterSection />
        </div>
      )}

      {/* =========================================================================
          SCREEN 2: FULL-SCREEN GATEPOST AI WORKSPACE (Inspired by Luxury Reference UI)
          ========================================================================= */}
      {currentView === 'chat' && (
        <div className="workspace-main-container">
          {/* ==================== 1. LEFT SIDEBAR ==================== */}
          <aside className={`workspace-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
            {/* Top Brand Header */}
            <div className="workspace-sidebar-top">
              <BrandLogo size={28} onClick={() => setCurrentView('network')} />
              <button
                className="sidebar-collapse-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title="Collapse sidebar"
              >
                <Menu size={16} />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="workspace-user-card">
              <div className="user-profile-left">
                <div className="workspace-avatar-round">
                  {usernameDisplay.charAt(0).toUpperCase()}
                </div>
                <div className="workspace-user-info">
                  <span className="workspace-user-name">{usernameDisplay}</span>
                  <span className="workspace-user-sub">
                    {currentUser?.email || (ollamaOnline ? '⚡ LLaMA 3.2' : 'Local Workspace')}
                  </span>
                </div>
              </div>
              <button
                className="user-settings-icon-btn"
                onClick={() => setIsModelSelectorOpen(true)}
                title="AI Model & Settings"
              >
                <Settings size={15} />
              </button>
            </div>

            {/* Search for Chats (ChatGPT Style with Ctrl K) */}
            <div className="workspace-search-bar">
              <Search size={14} className="search-icon" />
              <input
                ref={searchInputRef}
                id="chat-search-input"
                type="text"
                placeholder="Search for chats..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
              />
              <span className="search-shortcut-badge">Ctrl K</span>
            </div>

            {/* Navigation Menu (Chats, Library/Vault, Apps/Network Hub) */}
            <nav className="workspace-nav-list">
              <button
                className="workspace-nav-item active"
                onClick={() => {}}
              >
                <div className="nav-item-left">
                  <MessageSquare size={16} />
                  <span>Chats</span>
                </div>
                <span className="nav-shortcut-key">Ctrl 1</span>
              </button>

              <button
                className="workspace-nav-item"
                onClick={() => setIsVaultOpen(true)}
                title="Open Cloud Vault"
              >
                <div className="nav-item-left">
                  <Bookmark size={16} />
                  <span>Library & Vault</span>
                </div>
                <span className="nav-shortcut-key">Ctrl 2</span>
              </button>

              <button
                className="workspace-nav-item"
                onClick={() => setCurrentView('network')}
                title="Open Network Hub"
              >
                <div className="nav-item-left">
                  <LayoutDashboard size={16} />
                  <span>Network Hub</span>
                </div>
                <span className="nav-shortcut-key">Ctrl 3</span>
              </button>
            </nav>

            {/* CHAT LIST SECTIONS */}
            <div className="workspace-chats-scroll-area">
              {/* === A. PINNED CHATS SECTION (Like ChatGPT) === */}
              {pinnedChats.length > 0 && (
                <div className="workspace-sidebar-section">
                  <div className="section-label-row">
                    <span className="sidebar-section-heading">PINNED</span>
                    <span className="section-count-badge">{pinnedChats.length}</span>
                  </div>
                  <div className="sidebar-chats-list">
                    {pinnedChats.map((chat) => {
                      const id = chat._id || chat.id;
                      const isActive = id === currentChatId;
                      const isEditing = editingChatId === id;
                      return (
                        <div
                          key={id}
                          className={`sidebar-chat-item is-pinned ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            if (!isEditing) {
                              setCurrentChatId(id);
                              loadMessages(id, token);
                            }
                          }}
                        >
                          <Pin size={13} className="chat-pin-indicator filled" />
                          {isEditing ? (
                            <div className="chat-rename-form" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                className="chat-rename-input"
                                value={editingTitleText}
                                onChange={(e) => setEditingTitleText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(e, id);
                                  if (e.key === 'Escape') handleCancelRename(e);
                                }}
                                autoFocus
                              />
                              <button
                                className="chat-rename-save-btn"
                                onClick={(e) => handleSaveRename(e, id)}
                                title="Save title"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                className="chat-rename-cancel-btn"
                                onClick={(e) => handleCancelRename(e)}
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span
                                className="chat-item-title"
                                title={chat.title}
                                onDoubleClick={(e) => handleStartRename(e, chat)}
                              >
                                {chat.title || 'Conversation'}
                              </span>
                              <div className="chat-item-actions">
                                <button
                                  className="chat-action-btn rename-btn"
                                  onClick={(e) => handleStartRename(e, chat)}
                                  title="Rename conversation"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  className="chat-action-btn pin-btn active"
                                  onClick={(e) => handleTogglePin(e, id)}
                                  title="Unpin conversation"
                                >
                                  <Pin size={13} />
                                </button>
                                <button
                                  className="chat-action-btn delete-btn"
                                  onClick={(e) => handleDeleteChat(e, id)}
                                  title="Delete conversation"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* === B. CHAT HISTORY SECTION (Unpinned with hover 📌 like ChatGPT) === */}
              <div className="workspace-sidebar-section">
                <div className="section-label-row">
                  <span className="sidebar-section-heading">CHAT HISTORY</span>
                  <span className="section-count-badge">{historyChats.length}</span>
                </div>
                <div className="sidebar-chats-list">
                  {historyChats.map((chat) => {
                    const id = chat._id || chat.id;
                    const isActive = id === currentChatId;
                    const isEditing = editingChatId === id;
                    return (
                      <div
                        key={id}
                        className={`sidebar-chat-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          if (!isEditing) {
                            setCurrentChatId(id);
                            loadMessages(id, token);
                          }
                        }}
                      >
                        <MessageSquare size={13} className="chat-default-icon" />
                        {isEditing ? (
                          <div className="chat-rename-form" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              className="chat-rename-input"
                              value={editingTitleText}
                              onChange={(e) => setEditingTitleText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(e, id);
                                if (e.key === 'Escape') handleCancelRename(e);
                              }}
                              autoFocus
                            />
                            <button
                              className="chat-rename-save-btn"
                              onClick={(e) => handleSaveRename(e, id)}
                              title="Save title"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              className="chat-rename-cancel-btn"
                              onClick={(e) => handleCancelRename(e)}
                              title="Cancel"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className="chat-item-title"
                              title={chat.title}
                              onDoubleClick={(e) => handleStartRename(e, chat)}
                            >
                              {chat.title || 'Conversation'}
                            </span>
                            <div className="chat-item-actions">
                              <button
                                className="chat-action-btn rename-btn"
                                onClick={(e) => handleStartRename(e, chat)}
                                title="Rename conversation"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                className="chat-action-btn pin-btn"
                                onClick={(e) => handleTogglePin(e, id)}
                                title="Pin to top (like ChatGPT)"
                              >
                                <Pin size={13} />
                              </button>
                              <button
                                className="chat-action-btn delete-btn"
                                onClick={(e) => handleDeleteChat(e, id)}
                                title="Delete conversation"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {historyChats.length === 0 && pinnedChats.length === 0 && (
                    <div className="empty-chats-hint">No conversations yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Bottom Bar */}
            <div className="workspace-sidebar-footer">
              {currentUser ? (
                <button className="sidebar-logout-pill" onClick={handleLogout} title="Log out">
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  className="sidebar-login-pill"
                  onClick={() => {
                    setAuthPromptMessage('Sign in to GaTePoSt');
                    setIsAuthOpen(true);
                  }}
                >
                  <UserIcon size={14} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </aside>

          {/* ==================== 2. MAIN CHAT WORKSPACE CANVAS ==================== */}
          <main className="workspace-canvas">
            {/* Top Workspace Header Bar */}
            <header className="workspace-header-bar">
              <div className="header-left-group">
                {!sidebarOpen && (
                  <button
                    className="sidebar-reopen-btn"
                    onClick={() => setSidebarOpen(true)}
                    title="Open sidebar"
                  >
                    <Menu size={16} />
                  </button>
                )}

                {/* Conversation Title & Rename Option */}
                <div className="header-topic-wrapper">
                  {editingChatId === currentChatId ? (
                    <div className="header-rename-box" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        className="header-rename-input"
                        value={editingTitleText}
                        onChange={(e) => setEditingTitleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(e, currentChatId);
                          if (e.key === 'Escape') handleCancelRename(e);
                        }}
                        autoFocus
                      />
                      <button
                        className="header-rename-save-btn"
                        onClick={(e) => handleSaveRename(e, currentChatId)}
                        title="Save title"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        className="header-rename-cancel-btn"
                        onClick={(e) => handleCancelRename(e)}
                        title="Cancel"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="header-topic-display">
                      <h2
                        className="workspace-chat-topic"
                        title={currentChatTitle}
                        onDoubleClick={(e) => currentChat && handleStartRename(e, currentChat)}
                      >
                        {currentChatTitle}
                      </h2>
                      {currentChat && (
                        <button
                          className="header-edit-title-btn"
                          onClick={(e) => handleStartRename(e, currentChat)}
                          title="Rename conversation"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Active Model Pill Selector */}
                <div className="model-selector-wrapper" ref={modelDropdownRef}>
                  <button
                    className="workspace-model-pill"
                    onClick={() => setModelDropdownOpen((prev) => !prev)}
                    title="Switch AI model"
                  >
                    <span className="model-pill-text">{activeModel}</span>
                    <ChevronDown size={12} className={`chevron-anim ${modelDropdownOpen ? 'open' : ''}`} />
                  </button>

                  {modelDropdownOpen && (
                    <div className="model-fast-dropdown">
                      <div className="dropdown-header">
                        <span>Select Active Model</span>
                        <button
                          className="dropdown-modal-link"
                          onClick={() => {
                            setModelDropdownOpen(false);
                            setIsModelSelectorOpen(true);
                          }}
                        >
                          All Models ↗
                        </button>
                      </div>

                      <div className="dropdown-models-list">
                        {quickModelOptions.map((m) => {
                          const isCurrent = activeModel === m.id || activeModel.startsWith(m.id);
                          return (
                            <div
                              key={m.id}
                              className={`dropdown-model-option ${isCurrent ? 'active' : ''}`}
                              onClick={() => {
                                handleModelChange(m.id, m.provider);
                                setModelDropdownOpen(false);
                              }}
                            >
                              <div className="option-left">
                                <span className="option-icon">{m.provider === 'ollama' ? '⚡' : '☁️'}</span>
                                <div className="option-text">
                                  <div className="option-name">{m.name}</div>
                                  <div className="option-desc">{m.desc}</div>
                                </div>
                              </div>
                              {isCurrent && <Check size={14} color="#7c3aed" />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="dropdown-footer">
                        <button
                          className="dropdown-open-full-btn"
                          onClick={() => {
                            setModelDropdownOpen(false);
                            setIsModelSelectorOpen(true);
                          }}
                        >
                          <Cpu size={14} />
                          <span>Custom Models & Diagnostics...</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Workspace Action Icons */}
              <div className="header-right-group">
                {/* + New Chat Pill Button */}
                <button
                  className="workspace-new-chat-btn"
                  onClick={() => createNewChat(token)}
                  title="Start a new chat session"
                >
                  <Plus size={14} />
                  <span>New chat</span>
                </button>

                {/* Light / Dark Mode Toggle */}
                <button
                  className="workspace-icon-pill"
                  onClick={toggleTheme}
                  title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                >
                  {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                </button>

                {/* Model Selector / Settings */}
                <button
                  className="workspace-icon-pill"
                  onClick={() => setIsModelSelectorOpen(true)}
                  title="Model Settings"
                >
                  <Settings size={15} />
                </button>

                {/* Delete Current Chat */}
                <button
                  className="workspace-icon-pill"
                  onClick={(e) => currentChatId && handleDeleteChat(e, currentChatId)}
                  title="Clear / Delete conversation"
                >
                  <Trash2 size={15} />
                </button>

                {/* Cloud Vault */}
                <button
                  className="workspace-icon-pill"
                  onClick={() => setIsVaultOpen(true)}
                  title="Cloud Vault"
                >
                  <Bookmark size={15} />
                </button>

                {/* Right Inspector Toggle */}
                <button
                  className={`workspace-icon-pill ${inspectorOpen ? 'active' : ''}`}
                  onClick={() => setInspectorOpen(!inspectorOpen)}
                  title="Toggle Telemetry Inspector"
                >
                  <PanelRight size={15} />
                </button>
              </div>
            </header>

            {/* Conversation Messages Thread */}
            <div className="workspace-messages-stream">
              {/* Date Header Separator */}
              <div className="stream-date-divider">
                <span>Today 2:45 PM</span>
              </div>

              {/* Empty Welcome State */}
              {!hasMessages && (
                <div className="workspace-empty-state">
                  <div className="empty-brand-badge">
                    <Zap size={22} color="#7c3aed" />
                  </div>
                  <h1 className="empty-greeting-title">
                    Hello, <span className="highlight-text">{usernameDisplay}</span>
                  </h1>
                  <p className="empty-greeting-sub">How can GaTePoSt help you create today?</p>

                  <div className="empty-suggestion-cards">
                    <div
                      className="suggestion-box"
                      onClick={() => handleSend("Explain how tokens and context window work in modern LLMs")}
                    >
                      <span className="box-title">Explain LLM token mechanics</span>
                      <span className="box-sub">Deep dive into tokenizers and memory</span>
                    </div>

                    <div
                      className="suggestion-box"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <span className="box-title">Upload a photo for vision analysis</span>
                      <span className="box-sub">In-memory zero-disk privacy inspection</span>
                    </div>

                    <div
                      className="suggestion-box"
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      <span className="box-title">Summarize a PDF document</span>
                      <span className="box-sub">Extract key findings with citations</span>
                    </div>

                    <div
                      className="suggestion-box"
                      onClick={() => handleGenerateImage("A sleek cybernetic neural gateway with glowing violet plasma")}
                    >
                      <span className="box-title">Generate a concept graphic</span>
                      <span className="box-sub">High-resolution AI image synthesis</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages List */}
              {hasMessages && (
                <div className="workspace-thread-container">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    const msgId = msg._id || index;
                    return isUser ? (
                      /* USER MESSAGE ROW */
                      <div key={msgId} className="workspace-msg-row user-row">
                        <div className="msg-author-header">
                          <div className="msg-author-avatar user-avatar">
                            {usernameDisplay.charAt(0).toUpperCase()}
                          </div>
                          <span className="msg-author-name">{usernameDisplay}</span>
                          <span className="msg-timestamp">2:45 PM</span>
                        </div>
                        <div className="user-text-content">{msg.content_text}</div>
                      </div>
                    ) : (
                      /* GaTePoSt ASSISTANT MESSAGE ROW */
                      <div key={msgId} className="workspace-msg-row ai-row">
                        <div className="msg-author-header">
                          <div className="msg-author-avatar ai-avatar">
                            <div className="ai-avatar-inner" />
                          </div>
                          <span className="msg-author-name">GaTePoSt</span>
                          <span className="msg-timestamp">2:46 PM</span>

                          {/* Floating Fact Check / Share pill */}
                          <div className="floating-fact-check-pill">
                            <button
                              className="fact-pill-action"
                              onClick={() => handleShareMessage(msg.content_text)}
                            >
                              <Search size={11} />
                              <span>Fact check</span>
                            </button>
                            <span className="fact-pill-sep">·</span>
                            <button
                              className="fact-pill-action"
                              onClick={() => handleShareMessage(msg.content_text)}
                            >
                              <Share2 size={11} />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>

                        {/* Card Bubble Content */}
                        <div className="ai-card-bubble">
                          {msg.message_type && msg.message_type !== 'text' && (
                            <div className="ai-media-badge">
                              {msg.content_text?.includes('Saved to Cloud') ? (
                                <><CloudUpload size={12} color="#10b981" /> Saved in Cloud Vault</>
                              ) : (
                                <><ShieldCheck size={12} color="#7c3aed" /> In-Memory Zero-Disk</>
                              )}
                            </div>
                          )}

                          <div className="ai-text-content">{msg.content_text}</div>

                          {/* Image preview if generated/uploaded */}
                          {msg.image_data_url && (
                            <div className="ai-attached-media">
                              <img src={msg.image_data_url} alt="Attached Media" />
                            </div>
                          )}

                          {/* Card Footer Toolbar */}
                          <div className="ai-card-footer">
                            <div className="footer-actions-left">
                              <button
                                className="action-tiny-btn"
                                onClick={() => {
                                  const prevUserMsg = messages
                                    .slice(0, index)
                                    .reverse()
                                    .find((m) => m.role === 'user');
                                  if (prevUserMsg) handleSend(prevUserMsg.content_text);
                                }}
                                title="Regenerate response"
                              >
                                <RotateCw size={13} />
                              </button>

                              <button
                                className="action-tiny-btn"
                                onClick={() => handleCopyMessage(msgId, msg.content_text)}
                                title="Copy response"
                              >
                                {copiedMsgId === msgId ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                              </button>

                              <button
                                className="action-tiny-btn"
                                onClick={() => handleShareMessage(msg.content_text)}
                                title="Share response"
                              >
                                <Share2 size={13} />
                              </button>

                              <button
                                className="action-tiny-btn"
                                onClick={() => setIsVaultOpen(true)}
                                title="Save to Vault"
                              >
                                <Bookmark size={13} />
                              </button>

                              <button className="action-tiny-btn" title="More options">
                                <MoreHorizontal size={13} />
                              </button>
                            </div>

                            <div className="footer-tokens-badge">
                              <span>32 tokens</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Thinking / Loading Animation */}
                  {isLoading && (
                    <div className="workspace-msg-row ai-row">
                      <div className="msg-author-header">
                        <div className="msg-author-avatar ai-avatar pulse">
                          <div className="ai-avatar-inner" />
                        </div>
                        <span className="msg-author-name">GaTePoSt</span>
                        <span className="msg-timestamp">Generating...</span>
                      </div>
                      <div className="ai-card-bubble thinking-card">
                        <div className="pulse-dots">
                          <span className="pulse-dot" />
                          <span className="pulse-dot" />
                          <span className="pulse-dot" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={dialogEndRef} />
                </div>
              )}
            </div>

            {/* ==================== 3. FLOATING BOTTOM INPUT DOCK ==================== */}
            <div className="workspace-floating-input-dock">
              {/* Hidden File Inputs */}
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

              <div className="dock-card">
                {/* Top Formatting Mini-Bar */}
                <div className="dock-format-bar">
                  <div className="format-tools-group">
                    <button
                      className="format-icon-btn"
                      onClick={() => applyDockFormat('**', '**')}
                      title="Bold"
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      className="format-icon-btn"
                      onClick={() => applyDockFormat('*', '*')}
                      title="Italic"
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      className="format-icon-btn"
                      onClick={() => applyDockFormat('~~', '~~')}
                      title="Strikethrough"
                    >
                      <Strikethrough size={13} />
                    </button>
                    <button
                      className="format-icon-btn"
                      onClick={() => applyDockFormat('`', '`')}
                      title="Code / Monospace"
                    >
                      <Code size={13} />
                    </button>
                  </div>

                  {/* Storage Mode Toggle */}
                  <div className="storage-mode-toggle">
                    <button
                      className={`storage-pill ${saveToCloud ? 'cloud' : 'ram'}`}
                      onClick={() => setSaveToCloud(!saveToCloud)}
                      title="Toggle Zero-Disk In-Memory vs Cloud Vault"
                    >
                      {saveToCloud ? (
                        <><CloudUpload size={12} /><span>Cloud Vault</span></>
                      ) : (
                        <><Shield size={12} /><span>In-Memory RAM</span></>
                      )}
                    </button>
                  </div>
                </div>

                {/* Auto-expanding Text Input */}
                <div className="dock-textarea-wrapper">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    className="dock-textarea"
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
                </div>

                {/* Dock Bottom Actions Row */}
                <div className="dock-bottom-row">
                  <div className="dock-attachments">
                    <button
                      className="dock-tool-btn"
                      onClick={() => pdfInputRef.current?.click()}
                      title="Attach PDF Document"
                    >
                      <FileText size={15} />
                    </button>
                    <button
                      className="dock-tool-btn"
                      onClick={() => imageInputRef.current?.click()}
                      title="Attach Image / Photo"
                    >
                      <ImageIcon size={15} />
                    </button>
                    <button
                      className="dock-tool-btn"
                      onClick={() => handleSend("Describe what you are listening to")}
                      title="Voice Input"
                    >
                      <Mic size={15} />
                    </button>
                  </div>

                  <button
                    className={`dock-send-btn ${inputText.trim() ? 'active' : ''}`}
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || isLoading}
                    title="Send query"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* ==================== 4. RIGHT TELEMETRY INSPECTOR ==================== */}
          {inspectorOpen && (
            <aside className="workspace-inspector-panel">
              <div className="inspector-header">
                <span className="inspector-heading">CONTEXT 128,000</span>
                <button
                  className="inspector-close-btn"
                  onClick={() => setInspectorOpen(false)}
                  title="Close inspector"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Status Chips */}
              <div className="inspector-status-tags">
                <div className="status-tag success">
                  <CheckCircle2 size={13} />
                  <span>Searched web</span>
                </div>
                <div className="status-tag success">
                  <CheckCircle2 size={13} />
                  <span>Successfully ran</span>
                </div>
                <div className="status-tag info">
                  <Zap size={13} />
                  <span>Zero-latency Ollama</span>
                </div>
              </div>

              {/* Context / Telemetry Stats */}
              <div className="inspector-telemetry-box">
                <h4 className="box-title">System Telemetry</h4>
                <div className="telemetry-item">
                  <span className="item-label">Active Model</span>
                  <span className="item-val">{activeModel}</span>
                </div>
                <div className="telemetry-item">
                  <span className="item-label">Engine Provider</span>
                  <span className="item-val">{activeProvider === 'ollama' ? '⚡ Ollama (Local)' : '☁️ Cloud'}</span>
                </div>
                <div className="telemetry-item">
                  <span className="item-label">Storage Cache</span>
                  <span className="item-val">E:\storedchace</span>
                </div>
                <div className="telemetry-item">
                  <span className="item-label">Total Chats</span>
                  <span className="item-val">{chats.length}</span>
                </div>
                <div className="telemetry-item">
                  <span className="item-label">Pinned Chats</span>
                  <span className="item-val">{pinnedChats.length}</span>
                </div>
              </div>

              {/* Product Information */}
              <div className="inspector-info-card">
                <h4 className="info-title">GaTePoSt Intelligence</h4>
                <p className="info-desc">
                  Architected with high-speed local Ollama inference, in-memory zero-disk privacy, and persistent cloud synchronization.
                </p>
                <div className="creators-badge">
                  <span>Crafted by <strong>Tharak & Gowtham</strong></span>
                </div>
              </div>

              {/* Fast Shortcuts */}
              <div className="inspector-quick-actions">
                <button className="quick-action-link" onClick={() => setCurrentView('network')}>
                  <LayoutDashboard size={14} />
                  <span>Network Hub View</span>
                </button>
                <button className="quick-action-link" onClick={() => setIsVaultOpen(true)}>
                  <Bookmark size={14} />
                  <span>Cloud Vault Archive</span>
                </button>
                <button className="quick-action-link" onClick={() => setIsModelSelectorOpen(true)}>
                  <Cpu size={14} />
                  <span>Model Diagnostics</span>
                </button>
              </div>
            </aside>
          )}
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

      {/* About Modal (Tharak & Gowtham) */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Model Selector Modal */}
      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        activeModel={activeModel}
        onSelectModel={handleModelChange}
      />
    </div>
  );
}
