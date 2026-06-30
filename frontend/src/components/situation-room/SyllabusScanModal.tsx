'use client'

import { useMemo, useState } from 'react'
import { CheckSquare, FileText, Loader2, PencilLine, Square, Trash2, Upload, X } from 'lucide-react'
import api from '@/lib/api'

type DraftTask = {
  id: string
  selected: boolean
  title: string
  description: string
  deadline: string
  estimatedMinutes: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'study' | 'exam' | 'assignment' | 'work' | 'meeting' | 'payment' | 'health' | 'personal' | 'other'
  duplicate: boolean
}

interface ExtractedTaskPreview {
  title: string
  description?: string | null
  deadline?: string | null
  estimatedMinutes?: number
  priority?: string
  taskType?: string
  category?: string
}

interface Props {
  onClose: () => void
  onSaved: (result: { count: number }) => void
}

const PRIORITIES: Array<DraftTask['priority']> = ['critical', 'high', 'medium', 'low']
const CATEGORIES: Array<DraftTask['category']> = ['study', 'exam', 'assignment', 'work', 'meeting', 'payment', 'health', 'personal', 'other']

const formatDateOnly = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const toDatetimeLocal = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const detectDuplicates = (items: DraftTask[]) => {
  const counts = new Map<string, number>()
  items.forEach((item) => {
    const key = `${item.title.trim().toLowerCase()}|${item.deadline || 'no-date'}`
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return items.map((item) => ({
    ...item,
    duplicate: (counts.get(`${item.title.trim().toLowerCase()}|${item.deadline || 'no-date'}`) || 0) > 1
  }))
}

export default function SyllabusScanModal({ onClose, onSaved }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [drafts, setDrafts] = useState<DraftTask[]>([])
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneCount, setDoneCount] = useState<number | null>(null)

  const selectedDrafts = useMemo(() => drafts.filter((draft) => draft.selected), [drafts])
  const duplicateCount = useMemo(() => drafts.filter((draft) => draft.duplicate).length, [drafts])

  const handlePreview = async () => {
    if (!file) return
    setScanning(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('save', 'false')

      const { data } = await api.post('/tasks/scan-syllabus', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const nextDrafts = (data.tasks || []).map((task: ExtractedTaskPreview, index: number) => ({
        id: `${Date.now()}-${index}`,
        selected: true,
        title: `${task.title || ''}`.trim(),
        description: `${task.description || ''}`.trim(),
        deadline: toDatetimeLocal(task.deadline),
        estimatedMinutes: Number(task.estimatedMinutes) || 90,
        priority: PRIORITIES.includes(task.priority as DraftTask['priority']) ? task.priority as DraftTask['priority'] : 'medium',
        category: CATEGORIES.includes((task.category || task.taskType) as DraftTask['category'])
          ? (task.category || task.taskType) as DraftTask['category']
          : 'study',
        duplicate: false
      }))

      setDrafts(detectDuplicates(nextDrafts))
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not read this syllabus.')
    } finally {
      setScanning(false)
    }
  }

  const updateDraft = (id: string, patch: Partial<DraftTask>) => {
    setDrafts((prev) => detectDuplicates(prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))))
  }

  const removeDraft = (id: string) => {
    setDrafts((prev) => detectDuplicates(prev.filter((draft) => draft.id !== id)))
  }

  const handleSave = async () => {
    if (!selectedDrafts.length) {
      setError('Select at least one task to save.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const reviewedTasks = selectedDrafts.map((draft) => ({
        title: draft.title,
        description: draft.description,
        deadline: draft.deadline ? new Date(draft.deadline).toISOString() : null,
        estimatedMinutes: draft.estimatedMinutes,
        priority: draft.priority,
        category: draft.category
      }))

      const { data } = await api.post('/tasks/scan-syllabus/save', {
        originalFileName: file?.name || 'syllabus.pdf',
        reviewedTasks
      })

      setDoneCount(data.count || 0)
      onSaved({ count: data.count || 0 })
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not save selected tasks.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-[2rem] border border-sr-border bg-sr-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-sr-border px-5 py-4 sm:px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-red/10 text-sr-red">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-semibold text-sr-text">Scan PDF</h2>
            <p className="text-sm text-sr-muted">Scan any PDF to extract important deadlines, announcements, exams, assignments, and reminders before choosing what to save.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-sr-muted transition-colors hover:text-sr-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        {doneCount !== null ? (
          <div className="p-8 text-center">
            <p className="font-display text-3xl font-semibold text-sr-text">{doneCount} tasks saved</p>
            <p className="mt-2 text-sm text-sr-muted">Only the reviewed tasks you selected were added to your dashboard.</p>
            <button onClick={onClose} className="mt-5 rounded-full bg-sr-red px-5 py-3 text-sm font-bold text-white">
              Close
            </button>
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-5 sm:p-6">
            <div className="rounded-[1.75rem] border border-dashed border-sr-border bg-sr-header p-8 text-center sm:p-10">
              <input
                id="syllabus-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <label htmlFor="syllabus-upload" className="mx-auto flex w-fit cursor-pointer items-center gap-2 rounded-full border border-sr-border bg-sr-card px-5 py-3 text-sm font-semibold text-sr-text">
                <Upload className="h-4 w-4" />
                {file ? file.name : 'Choose PDF'}
              </label>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-sr-muted">
                We’ll extract important deadlines, announcements, exams, assignments, and project dates. You’ll review every result before anything gets saved.
              </p>

              <div className="mx-auto mt-5 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
                {[
                  'Exam dates and quiz schedules',
                  'Assignments, labs, and project deadlines',
                  'Important announcements and semester reminders'
                ].map((item) => (
                  <div key={item} className="rounded-[1.25rem] bg-sr-card px-4 py-3 text-sm text-sr-muted">
                    {item}
                  </div>
                ))}
              </div>

              <button
                onClick={handlePreview}
                disabled={!file || scanning}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-sr-red px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {scanning ? 'Reading your syllabus...' : 'Extract tasks'}
              </button>
            </div>
            {error ? <p className="mt-4 text-sm font-medium text-sr-red">{error}</p> : null}
          </div>
        ) : (
          <div className="grid gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="border-b border-sr-border bg-sr-header p-4 sm:p-5 lg:border-b-0 lg:border-r">
              <div className="rounded-[1.5rem] bg-sr-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">Import Summary</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[1.25rem] bg-sr-header p-3 text-center">
                    <p className="font-display text-2xl font-bold text-sr-text">{drafts.length}</p>
                    <p className="mt-1 text-xs text-sr-muted">Extracted</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-sr-header p-3 text-center">
                    <p className="font-display text-2xl font-bold text-sr-red">{selectedDrafts.length}</p>
                    <p className="mt-1 text-xs text-sr-muted">Selected</p>
                  </div>
                </div>
                <div className="mt-3 rounded-[1.25rem] bg-sr-header p-3">
                  <p className="text-sm font-medium text-sr-text">Quality check</p>
                  <p className="mt-1 text-sm text-sr-muted">
                    {duplicateCount > 0
                      ? `${duplicateCount} possible duplicate ${duplicateCount === 1 ? 'item' : 'items'} detected.`
                      : 'No obvious duplicates detected.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={() => setDrafts((prev) => prev.map((draft) => ({ ...draft, selected: true })))}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sr-border bg-sr-card px-4 py-3 text-sm font-semibold text-sr-text"
                >
                  <CheckSquare className="h-4 w-4" />
                  Select all
                </button>
                <button
                  onClick={() => setDrafts((prev) => prev.map((draft) => ({ ...draft, selected: false })))}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sr-border bg-sr-card px-4 py-3 text-sm font-semibold text-sr-text"
                >
                  <Square className="h-4 w-4" />
                  Clear selection
                </button>
                <button
                  onClick={() => {
                    setDrafts([])
                    setFile(null)
                    setError(null)
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sr-border bg-sr-card px-4 py-3 text-sm font-semibold text-sr-text"
                >
                  <Upload className="h-4 w-4" />
                  Scan another PDF
                </button>
              </div>

              <div className="mt-4 rounded-[1.5rem] bg-sr-card p-4">
                <p className="text-sm font-semibold text-sr-text">Recommended flow</p>
                <div className="mt-3 space-y-3 text-sm text-sr-muted">
                  <div className="flex gap-3">
                    <PencilLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-sr-red" />
                    Edit titles, dates, and categories if the extraction looks off.
                  </div>
                  <div className="flex gap-3">
                    <Trash2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sr-red" />
                    Remove optional, duplicate, or irrelevant items before saving.
                  </div>
                </div>
              </div>
            </aside>

            <section className="p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-sr-text">Review extracted tasks</p>
                  <p className="text-sm text-sr-muted">Select what matters, edit details, then save only the checked tasks.</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !selectedDrafts.length}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-sr-red px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {saving ? 'Saving selected tasks...' : `Save ${selectedDrafts.length} selected`}
                </button>
              </div>

              <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                {drafts.map((draft) => (
                  <div key={draft.id} className={`rounded-[1.5rem] border p-4 transition-colors ${draft.selected ? 'border-sr-red/40 bg-sr-header' : 'border-sr-border bg-sr-card opacity-85'}`}>
                    <div className="mb-3 flex items-start gap-3">
                      <button
                        onClick={() => updateDraft(draft.id, { selected: !draft.selected })}
                        className={`mt-1 rounded-md transition-colors ${draft.selected ? 'text-sr-red' : 'text-sr-muted'}`}
                        title={draft.selected ? 'Deselect task' : 'Select task'}
                      >
                        {draft.selected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {draft.duplicate ? <span className="rounded-full bg-sr-orange/10 px-2.5 py-1 text-xs font-semibold text-sr-orange">Possible duplicate</span> : null}
                          {!draft.deadline ? <span className="rounded-full bg-sr-purple/10 px-2.5 py-1 text-xs font-semibold text-sr-purple">No deadline found</span> : null}
                        </div>
                      </div>

                      <button
                        onClick={() => removeDraft(draft.id)}
                        className="rounded-full p-2 text-sr-muted transition-colors hover:text-sr-red"
                        title="Remove task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-sr-muted">Title</label>
                        <input
                          value={draft.title}
                          onChange={(event) => updateDraft(draft.id, { title: event.target.value })}
                          className="w-full rounded-xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none focus:border-sr-red"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-sr-muted">Description</label>
                        <textarea
                          value={draft.description}
                          onChange={(event) => updateDraft(draft.id, { description: event.target.value })}
                          rows={3}
                          className="w-full rounded-xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none focus:border-sr-red"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-sr-muted">Deadline Date</label>
                        <input
                          type="date"
                          value={formatDateOnly(draft.deadline)}
                          onChange={(event) => {
                            const nextDate = event.target.value
                            const currentTime = draft.deadline && draft.deadline.includes('T')
                              ? draft.deadline.split('T')[1]
                              : ''
                            updateDraft(draft.id, { deadline: nextDate ? `${nextDate}${currentTime ? `T${currentTime}` : ''}` : '' })
                          }}
                          className="w-full rounded-xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none focus:border-sr-red"
                        />
                        <p className="mt-1 text-xs text-sr-muted">Optional</p>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-sr-muted">Deadline Time</label>
                        <input
                          type="time"
                          value={draft.deadline && draft.deadline.includes('T') ? draft.deadline.split('T')[1] : ''}
                          onChange={(event) => {
                            const nextTime = event.target.value
                            const currentDate = formatDateOnly(draft.deadline)
                            updateDraft(draft.id, { deadline: currentDate ? `${currentDate}${nextTime ? `T${nextTime}` : ''}` : '' })
                          }}
                          className="w-full rounded-xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none focus:border-sr-red"
                        />
                        <p className="mt-1 text-xs text-sr-muted">Optional</p>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-sr-muted">Estimated minutes</label>
                        <input
                          type="number"
                          min="15"
                          step="15"
                          value={draft.estimatedMinutes}
                          onChange={(event) => updateDraft(draft.id, { estimatedMinutes: Number(event.target.value) || 90 })}
                          className="w-full rounded-xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none focus:border-sr-red"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-sr-muted">Priority</label>
                        <select
                          value={draft.priority}
                          onChange={(event) => updateDraft(draft.id, { priority: event.target.value as DraftTask['priority'] })}
                          className="w-full rounded-xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none"
                        >
                          {PRIORITIES.map((priority) => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-sr-muted">Category</label>
                        <select
                          value={draft.category}
                          onChange={(event) => updateDraft(draft.id, { category: event.target.value as DraftTask['category'] })}
                          className="w-full rounded-xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none"
                        >
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error ? <p className="mt-4 text-sm font-medium text-sr-red">{error}</p> : null}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
