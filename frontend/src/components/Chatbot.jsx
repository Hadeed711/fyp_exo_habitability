import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Loader2, Bot, User,
  Minimize2, Maximize2, AlertCircle,
} from 'lucide-react';
import axios from 'axios';

// ─── API call ─────────────────────────────────────────────────────────────────

const sendChatMessage = async (message, history) => {
  const { data } = await axios.post('/api/chatbot/', { message, history });
  return data;
};

const checkChatbotStatus = async () => {
  const { data } = await axios.get('/api/chatbot/');
  return data;
};

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'What makes a planet habitable?',
  'Explain the Habitable Zone',
  'Why can\'t we detect oxygen on exoplanets?',
  'What is the ESI score?',
  'How does the ML model work?',
  'What are M-dwarf planets?',
];

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
// Very simple: bold, code, line breaks. No deps needed.

const renderMessage = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, idx) => {
    // Bold: **text**
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={idx}>
        {parts.map((part, i) =>
          i % 2 === 1
            ? <strong key={i} className="font-semibold text-cyan-200">{part}</strong>
            : <span key={i}>{part}</span>
        )}
        {idx < text.split('\n').length - 1 && <br />}
      </span>
    );
  });
};

// ─── Message bubble ───────────────────────────────────────────────────────────

const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  const isError = msg.role === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5
        ${isUser
          ? 'bg-cyan-500/20 border border-cyan-500/30'
          : isError
            ? 'bg-red-500/20 border border-red-500/30'
            : 'bg-violet-500/20 border border-violet-500/30'
        }`}>
        {isUser
          ? <User size={13} className="text-cyan-400" />
          : isError
            ? <AlertCircle size={13} className="text-red-400" />
            : <Bot size={13} className="text-violet-400" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed
        ${isUser
          ? 'bg-cyan-500/15 border border-cyan-500/20 text-cyan-50 rounded-tr-sm'
          : isError
            ? 'bg-red-900/30 border border-red-500/20 text-red-300 rounded-tl-sm'
            : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-sm'
        }`}>
        {isError
          ? <span className="whitespace-pre-wrap">{msg.content}</span>
          : renderMessage(msg.content)
        }
        {msg.model && (
          <p className="mt-1.5 text-[10px] text-slate-600">via {msg.model}</p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Setup notice ─────────────────────────────────────────────────────────────

const SetupNotice = () => (
  <div className="mx-3 mb-3 rounded-xl bg-amber-900/20 border border-amber-500/20 p-3">
    <div className="flex items-center gap-2 mb-2">
      <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
      <span className="text-amber-300 text-xs font-semibold">API key not configured</span>
    </div>
    <p className="text-slate-400 text-[11px] leading-relaxed mb-2">
      ARIA uses the Groq API (free tier). Set up in 2 minutes:
    </p>
    <div className="space-y-1">
      {[
        '1. Go to console.groq.com → sign up free',
        '2. Create an API key',
        '3. Add GROQ_API_KEY=gsk_... to backend env',
        '4. Restart Django server',
      ].map(step => (
        <p key={step} className="text-[11px] font-mono text-slate-300">{step}</p>
      ))}
    </div>
  </div>
);

// ─── Main Chatbot Component ───────────────────────────────────────────────────

const Chatbot = () => {
  const [isOpen,       setIsOpen]       = useState(false);
  const [isMinimized,  setIsMinimized]  = useState(false);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [status,       setStatus]       = useState(null);   // null | status object
  const [unread,       setUnread]       = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && isOpen && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Check backend status on first open
  useEffect(() => {
    if (!isOpen || status !== null) return;
    checkChatbotStatus()
      .then(setStatus)
      .catch(() => setStatus({ api_key_configured: false }));
  }, [isOpen, status]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnread(0);
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content:
          'Hi! I\'m **ARIA** — your Astrobiology Research Intelligence Assistant. ' +
          'I know everything about the 9,614 exoplanets in this explorer, ' +
          'habitability science, and our ML models.\n\nWhat would you like to know?',
      }]);
    }
  }, [messages.length]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const handleSend = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Build history for the API (exclude system messages and error messages)
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-16)   // last 8 turns
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const result = await sendChatMessage(userText, history);

      if (result.setup_required) {
        setMessages(prev => [...prev, {
          role: 'error',
          content: result.message || 'GROQ_API_KEY is not configured. See setup instructions above.',
        }]);
        setStatus({ api_key_configured: false });
      } else if (result.error) {
        setMessages(prev => [...prev, {
          role: 'error',
          content: `Error: ${result.error}`,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.reply || '(empty response)',
          model: result.model,
        }]);
        if (!isOpen || isMinimized) setUnread(u => u + 1);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message
        || err?.response?.data?.error
        || err?.message
        || 'Could not reach the chatbot server.';
      setMessages(prev => [...prev, {
        role: 'error',
        content: `${errMsg}\n\nMake sure the Django backend is running on port 8000.`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, isOpen, isMinimized]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleSuggestion = useCallback((text) => {
    handleSend(text);
  }, [handleSend]);

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-[9000] w-14 h-14 rounded-full flex items-center justify-center
                       bg-gradient-to-br from-violet-600 to-cyan-600 shadow-[0_0_24px_rgba(139,92,246,0.5)]
                       border border-violet-400/30 transition-shadow hover:shadow-[0_0_36px_rgba(139,92,246,0.7)]"
            title="Chat with ARIA"
          >
            <Bot size={22} className="text-white" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-400
                               flex items-center justify-center text-[10px] font-bold text-slate-900">
                {unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat window ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-[9000] flex flex-col"
            style={{
              width: 360,
              height: isMinimized ? 52 : 520,
              transition: 'height 0.25s ease',
            }}
          >
            {/* Glass card */}
            <div className="flex flex-col h-full rounded-2xl overflow-hidden
                            bg-slate-950/95 border border-violet-500/20
                            shadow-[0_0_60px_rgba(139,92,246,0.15),0_25px_50px_rgba(0,0,0,0.6)]
                            backdrop-blur-xl">

              {/* ── Header ────────────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-4 py-3
                              border-b border-slate-800/60 bg-slate-900/60 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500
                                  flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold leading-none">ARIA</p>
                    <p className="text-slate-500 text-[10px] leading-none mt-0.5">
                      {status?.active_model
                        ? `via ${status.active_model}`
                        : status?.ollama_running === false
                          ? 'Ollama not running'
                          : 'Astrobiology Assistant'}
                    </p>
                  </div>
                  {/* Online dot */}
                  <div className={`w-1.5 h-1.5 rounded-full ml-1 ${
                    status?.ollama_running ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(v => !v)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
                  >
                    {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800/60 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* ── Body (hidden when minimized) ───────────────────────── */}
              {!isMinimized && (
                <>
                  {/* API key setup notice */}
                  {status?.api_key_configured === false && (
                    <div className="flex-shrink-0 pt-3">
                      <SetupNotice />
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3
                                  scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {messages.map((msg, idx) => (
                      <MessageBubble key={idx} msg={msg} />
                    ))}

                    {/* Loading indicator */}
                    {loading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30
                                        flex items-center justify-center mt-0.5">
                          <Bot size={13} className="text-violet-400" />
                        </div>
                        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm
                                        px-4 py-3 flex items-center gap-1.5">
                          {[0, 0.15, 0.3].map(delay => (
                            <motion.div
                              key={delay}
                              className="w-1.5 h-1.5 rounded-full bg-violet-400"
                              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                              transition={{ repeat: Infinity, duration: 0.9, delay }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggestions (only when no user messages yet) */}
                  {messages.filter(m => m.role === 'user').length === 0 && !loading && (
                    <div className="px-3 pb-2 flex-shrink-0">
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTIONS.slice(0, 3).map(s => (
                          <button
                            key={s}
                            onClick={() => handleSuggestion(s)}
                            className="text-[10.5px] px-2.5 py-1 rounded-full
                                       bg-slate-800/70 border border-slate-700/50
                                       text-slate-400 hover:text-slate-200 hover:border-violet-500/40
                                       transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Input bar ─────────────────────────────────────── */}
                  <div className="flex-shrink-0 px-3 pb-3 pt-1
                                  border-t border-slate-800/60">
                    <div className="flex gap-2 items-end">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about exoplanets, habitability, ML models…"
                        rows={1}
                        disabled={loading}
                        className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-[12.5px]
                                   bg-slate-800/70 border border-slate-700/50 text-slate-200
                                   placeholder:text-slate-600 focus:outline-none
                                   focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20
                                   disabled:opacity-50 transition-colors leading-relaxed
                                   scrollbar-thin scrollbar-thumb-slate-600"
                        style={{ maxHeight: 88 }}
                        onInput={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 88) + 'px';
                        }}
                      />
                      <button
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                                   bg-gradient-to-br from-violet-600 to-cyan-600
                                   disabled:opacity-40 disabled:cursor-not-allowed
                                   hover:shadow-[0_0_14px_rgba(139,92,246,0.5)] transition-all"
                      >
                        {loading
                          ? <Loader2 size={14} className="text-white animate-spin" />
                          : <Send size={14} className="text-white" />
                        }
                      </button>
                    </div>
                    <p className="text-center text-[10px] text-slate-700 mt-1.5">
                      Powered by Ollama · Local · Free · No API key
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
