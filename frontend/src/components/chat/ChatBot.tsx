'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Zap, Plus } from 'lucide-react'
import api from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: number
  tasksAdded?: number
}

interface Props {
  onTasksAdded?: () => void
}

const QUICK = [
  'What should I do first?',
  'Add: submit assignment tomorrow 11pm',
  "How much time do I need?",
  "What's due today?",
]

export default function ChatBot({ onTasksAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I can help you organize tasks, decide what to do first, or add a deadline from plain text.\n\nTry: \"Add: submit ML assignment tomorrow 11pm\" or \"What should I focus on first?\"",
      ts: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    const userMsg: Message = { role: 'user', content: msg, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const { data } = await api.post('/ai/chat', { message: msg, history })
      const reply: Message = {
        role: 'assistant',
        content: data.reply,
        ts: Date.now(),
        tasksAdded: data.tasksAdded
      }
      setMessages(prev => [...prev, reply])
      if (data.tasksAdded > 0) onTasksAdded?.()
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Couldn't connect. Try again in a moment.",
        ts: Date.now()
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, loading, messages, onTasksAdded])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all ${
          open ? 'bg-sr-header border border-sr-border text-sr-muted rotate-0' : 'bg-sr-red text-white hover:bg-red-600'
        }`}
      >
        {open
          ? <X className="w-5 h-5 text-sr-muted" />
          : <MessageCircle className="w-6 h-6" />
        }
        {!open && messages.length > 1 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-sr-orange rounded-full text-[9px] font-bold flex items-center justify-center text-white">
            {messages.filter(m => m.role === 'assistant').length - 1}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[540px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-sr-border bg-sr-card shadow-2xl sm:right-6 sm:max-w-md">
          {/* Header */}
          <div className="bg-sr-header border-b border-sr-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-sr-red flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sr-text font-semibold text-sm">Defuse Assistant</p>
              <p className="text-[10px] flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${loading ? 'bg-sr-orange animate-pulse' : 'bg-sr-green'}`} />
                <span className={loading ? 'text-sr-orange' : 'text-sr-green'}>
                  {loading ? 'Thinking...' : 'Online — knows your tasks'}
                </span>
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-sr-muted hover:text-sr-text transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-sr-red flex items-center justify-center flex-shrink-0 mb-0.5">
                    <Zap className="w-3 h-3 text-white" fill="white" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-sr-red text-white rounded-br-sm'
                      : 'bg-sr-header text-sr-text rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.tasksAdded && msg.tasksAdded > 0 ? (
                    <div className="flex items-center gap-1 text-[10px] text-sr-green ml-1">
                      <Plus className="w-3 h-3" />
                      {msg.tasksAdded} task{msg.tasksAdded > 1 ? 's' : ''} added to your list
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {/* Three-dot typing indicator */}
            {loading && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-sr-red flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3 text-white" fill="white" />
                </div>
                <div className="bg-sr-header rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                  <span className="typing-dot w-2 h-2 bg-sr-muted rounded-full inline-block" />
                  <span className="typing-dot w-2 h-2 bg-sr-muted rounded-full inline-block" />
                  <span className="typing-dot w-2 h-2 bg-sr-muted rounded-full inline-block" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies — only on first open */}
          {messages.length === 1 && !loading && (
            <div className="px-3 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
              {QUICK.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs bg-sr-header border border-sr-border text-sr-muted hover:text-sr-text hover:border-sr-red rounded-full px-3 py-1.5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-sr-border flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder='Ask anything or "Add: task name due date"'
              disabled={loading}
              className="flex-1 bg-sr-header border border-sr-border rounded-xl px-3.5 py-2.5 text-sm text-sr-text placeholder-sr-muted outline-none focus:border-sr-red transition-colors disabled:opacity-60"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-sr-red rounded-xl flex items-center justify-center text-white hover:bg-red-600 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
