
import React, { useEffect, useRef, useState } from 'react';
import { getAiHistory, sendAiMessage } from '../utils/api';

interface ChatSectionProps {
  personId: number;
  token: string; // kept for compatibility; axios reads token from localStorage
}

type Turn = { role: 'user' | 'assistant'; content: string; created_at?: string };

const ChatSection: React.FC<ChatSectionProps> = ({ personId }) => {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMin, setIsMin] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function loadHistory() {
    try {
      setError(null);
      const data = await getAiHistory(personId);
      setTurns(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load chat history');
      setTurns([]);
    }
  }

  useEffect(() => { loadHistory(); }, [personId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;

    setTurns((t) => [...t, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const data = await sendAiMessage(personId, msg);
      const reply = data?.reply ?? '…';
      setTurns((t) => [...t, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setError(e?.message || 'Failed to send message');
      setTurns((t) => [...t, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (isMin) {
    return (
      <div className="px-1 py-1">
        <button
          className="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-2"
          onClick={() => setIsMin(false)}
          title="Expand chat"
        >
          <span className="font-semibold">Chat Journal</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5 5 5-5" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="glass-soft h-[65vh] lg:h-[70vh] flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Chat Journal</h3>
            <p className="text-xs text-gray-400">Share memories, stories or notes</p>
          </div>
          <button className="text-gray-400 hover:text-white" onClick={() => setIsMin(true)} title="Minimize">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        {error && (
          <div className="mt-3 glass-card px-3 py-2 text-xs text-red-300 border border-red-500/30">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 scroll-fade px-3 py-3 space-y-3">
        {turns.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          turns.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                <div className="text-[11px] text-gray-400 mb-1">
                  {t.role === 'user' ? 'You' : 'Novana'}
                  {t.created_at ? ` · ${new Date(t.created_at).toLocaleString()}` : ''}
                </div>
                <div className={`bubble ${t.role === 'user' ? '' : 'bg-white/10 text-white'}`}>
                  {t.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-white/10 px-3 py-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a message..."
          disabled={loading}
          className="space-input flex-1 min-w-0 text-xs sm:text-sm"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="space-button-primary hover:scale-100 flex-shrink-0 text-xs sm:text-sm px-3 py-2"
        >
          {loading ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatSection;
