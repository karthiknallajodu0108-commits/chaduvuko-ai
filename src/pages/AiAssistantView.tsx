import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Plus,
  Send,
  Trash2,
  MessageSquare,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { aiApi } from '../services/aiApiClient';
import type { ChatConversationRecord, ChatMessageRecord } from '../types/career';

const STARTER_PROMPTS = [
  'Analyze my resume and identify the top 3 improvements.',
  'Which roles best fit my skills and background?',
  'Prepare me for a technical and behavioral interview.',
  'Create a focused 30-day learning plan for my target role.',
  'Find high-impact skills I am currently missing.',
  'Rewrite my professional summary with clearer impact.',
];

export function AiAssistantView() {
  const [conversations, setConversations] = useState<ChatConversationRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [input, setInput] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const skipNextFetchForIdRef = useRef<string | null>(null);

  const fetchConversations = async () => {
    setLoadingConvos(true);
    try {
      const list = await aiApi.listConversations();
      const safeList = Array.isArray(list) ? list : [];
      setConversations(safeList);
      if (safeList.length > 0 && !activeId) {
        setActiveId(safeList[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load conversations.');
    } finally {
      setLoadingConvos(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    if (skipNextFetchForIdRef.current === activeId) {
      skipNextFetchForIdRef.current = null;
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    aiApi
      .listMessages(activeId)
      .then((rows) => {
        if (!cancelled) setMessages(Array.isArray(rows) ? rows : []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load messages.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleNewConversation = async (initialTitle?: string) => {
    setError(null);
    setLastFailedPrompt(null);
    try {
      const created = await aiApi.createConversation(initialTitle);
      skipNextFetchForIdRef.current = created.id;
      setConversations((prev) => [created, ...prev]);
      setActiveId(created.id);
      setMessages([]);
      return created.id;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create conversation.');
      return null;
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiApi.deleteConversation(id);
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          setActiveId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete conversation.');
    }
  };

  const handleSend = async (promptOverride?: string) => {
    const content = (promptOverride ?? input).trim();
    if (!content || sending) return;

    setError(null);
    setLastFailedPrompt(null);
    setSending(true);
    if (!promptOverride) setInput('');

    let optimisticId: string | null = null;
    try {
      let targetConversationId = activeId;
      if (!targetConversationId) {
        const shortTitle = content.length > 48 ? `${content.slice(0, 48)}…` : content;
        targetConversationId = await handleNewConversation(shortTitle);
      }
      if (!targetConversationId) {
        setLastFailedPrompt(content);
        if (!promptOverride) setInput(content);
        setSending(false);
        return;
      }

      optimisticId = `temp-${Date.now()}`;
      const optimisticUser: ChatMessageRecord = {
        id: optimisticId,
        conversationId: targetConversationId,
        userUid: '',
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);

      const result = await aiApi.sendChatMessage(targetConversationId, content);

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticId),
        result.userMessage,
        result.assistantMessage,
      ]);
    } catch (err: unknown) {
      if (optimisticId) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
      setLastFailedPrompt(content);
      setError(err instanceof Error ? err.message : 'The AI assistant could not respond.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-11rem)]">
      {/* Conversation History Sidebar */}
      <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200 bg-[#F8FAFC] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-[#101828]">Conversations</h2>
          <button
            type="button"
            onClick={() => handleNewConversation()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#101828] hover:bg-[#142033] rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 max-h-56 lg:max-h-none">
          {loadingConvos ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-200/70 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="p-3 text-xs text-[#64748B]">
              Start a conversation to save your career strategy sessions here.
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setActiveId(conv.id);
                }}
                className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                  activeId === conv.id
                    ? 'bg-white border border-slate-200 text-[#101828] font-semibold'
                    : 'text-[#64748B] hover:bg-white/70 hover:text-[#101828]'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{conv.title}</span>
                </span>
                <button
                  type="button"
                  aria-label="Delete conversation"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Canvas */}
      <section className="lg:col-span-9 flex flex-col bg-white">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="font-display text-base font-bold text-[#101828]">
              CHADHUVUKO AI Strategist
            </h1>
            <p className="text-xs text-[#64748B]">
              Grounded in your saved profile and primary resume — never fabricates experience.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-5">
          {error && (
            <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
              {lastFailedPrompt && !sending && (
                <button
                  type="button"
                  onClick={() => handleSend(lastFailedPrompt)}
                  className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1 text-xs font-semibold text-rose-900 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          {loadingMessages ? (
            <div className="space-y-4 py-8">
              <div className="h-14 w-2/3 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-24 w-3/4 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          ) : messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-8">
              <h2 className="font-display text-xl font-bold text-[#101828]">
                How can I help advance your career today?
              </h2>
              <p className="mt-1.5 text-sm text-[#64748B]">
                Ask about your resume, role transitions, interview strategy, or skill plans.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="text-left p-4 rounded-xl border border-slate-200 hover:border-[#101828]/40 hover:bg-[#F8FAFC] text-sm text-[#172033] transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#101828] text-white'
                      : 'bg-[#F8FAFC] border border-slate-200 text-[#172033]'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-slate max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_h3]:font-display [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs text-[#64748B]">
                <Loader2 className="w-4 h-4 animate-spin text-[#101828]" />
                <span>Analyzing your profile and preparing guidance...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 border-t border-slate-200 bg-[#F8FAFC]"
        >
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask CHADHUVUKO about your resume, job fit, interview answers, or skill roadmap..."
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#172033] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#101828]/20 focus:border-[#101828]"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] disabled:opacity-50 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
