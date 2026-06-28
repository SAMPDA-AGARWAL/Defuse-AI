'use client'
import { useState, useRef, useCallback } from 'react'
import { Send, Camera, Loader2, CheckCircle, Image as ImageIcon, X } from 'lucide-react'
import api from '@/lib/api'

interface Props { onTasksAdded: () => void }

export default function BrainDumpInput({ onTasksAdded }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(0)
  const [pastedImage, setPastedImage] = useState<{ file: File; preview: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const flashSuccess = (count: number) => {
    setSuccess(count)
    setTimeout(() => setSuccess(0), 3500)
  }

  const sendImage = async (file: File) => {
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/tasks/extract', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      flashSuccess(data.count || 0)
      setPastedImage(null)
      onTasksAdded()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleTextSubmit = async () => {
    if (pastedImage) { await sendImage(pastedImage.file); return }
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      const { data } = await api.post('/ai/extract-text', { text })
      flashSuccess(data.count || 0)
      setText('')
      onTasksAdded()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file)
      setPastedImage({ file, preview })
    } else {
      await sendImage(file)
    }
    e.target.value = ''
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (!imageItem) return

    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) return

    const preview = URL.createObjectURL(file)
    setPastedImage({ file, preview })
  }, [])

  const clearImage = () => {
    if (pastedImage) URL.revokeObjectURL(pastedImage.preview)
    setPastedImage(null)
    inputRef.current?.focus()
  }

  return (
    <div className="bg-sr-header border-t border-sr-border px-4 py-3">
      {success > 0 && (
        <div className="flex items-center gap-2 text-sr-green text-xs mb-2 animate-pulse">
          <CheckCircle className="w-3.5 h-3.5" />
          {success} task{success !== 1 ? 's' : ''} added to war room
        </div>
      )}

      {/* Pasted image preview */}
      {pastedImage && (
        <div className="mb-2 flex items-center gap-2 bg-sr-card border border-sr-border rounded-xl px-3 py-2">
          <ImageIcon className="w-4 h-4 text-sr-orange flex-shrink-0" />
          <img src={pastedImage.preview} alt="pasted" className="h-10 w-16 object-cover rounded" />
          <span className="text-sr-muted text-xs flex-1">Screenshot ready — hit send to extract tasks</span>
          <button onClick={clearImage} className="text-sr-muted hover:text-sr-red transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-9 h-9 flex items-center justify-center text-sr-muted hover:text-sr-red transition-colors disabled:opacity-50 flex-shrink-0"
          title="Upload screenshot or PDF"
        >
          <Camera className="w-5 h-5" />
        </button>
        <input
          ref={inputRef}
          value={pastedImage ? '' : text}
          onChange={e => { if (!pastedImage) setText(e.target.value) }}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleTextSubmit()}
          onPaste={handlePaste}
          placeholder={pastedImage ? 'Screenshot attached — press send' : 'Dump everything on your mind... or paste a screenshot'}
          className="flex-1 bg-sr-card border border-sr-border rounded-xl px-4 py-2.5 text-sm text-sr-text placeholder-sr-muted outline-none focus:border-sr-red transition-colors"
          readOnly={!!pastedImage}
        />
        <button
          onClick={handleTextSubmit}
          disabled={(!text.trim() && !pastedImage) || loading}
          className="w-9 h-9 bg-sr-red text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-40 flex-shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-sr-muted text-[10px] mt-1.5 ml-11">Ctrl+V to paste screenshot directly</p>
    </div>
  )
}
