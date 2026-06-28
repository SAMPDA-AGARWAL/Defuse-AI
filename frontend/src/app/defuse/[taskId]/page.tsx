'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Copy, Loader2, Pause, Play, RefreshCw, Sparkles } from 'lucide-react'
import api from '@/lib/api'
import { useCountdown } from '@/hooks/useCountdown'
import type { Task } from '@/types'

export default function DefusePage() {
  const { taskId } = useParams<{ taskId: string }>()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeBlock, setActiveBlock] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loadingContent, setLoadingContent] = useState(false)
  const [copied, setCopied] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const countdown = useCountdown(task?.deadline)

  useEffect(() => {
    const fetchAndPrepare = async () => {
      try {
        const { data: taskData } = await api.get(`/tasks/${taskId}`)
        setTask(taskData.task)

        if (!taskData.task.defusePlan?.sprintBlocks?.length) {
          setGenerating(true)
          await api.post(`/ai/defuse/${taskId}`, { percentComplete: 0 })
          const { data: fresh } = await api.get(`/tasks/${taskId}`)
          setTask(fresh.task)
          setGenerating(false)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchAndPrepare()
  }, [taskId])

  useEffect(() => {
    const blocks = task?.defusePlan?.sprintBlocks
    if (blocks?.[activeBlock]) {
      setTimeLeft(blocks[activeBlock].durationMinutes * 60)
    }
  }, [activeBlock, task])

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((current) => {
          if (current <= 1) {
            setTimerRunning(false)
            return 0
          }
          return current - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerRunning])

  const loadStarterContent = async (index: number) => {
    if (!task?.defusePlan?.sprintBlocks[index]?.starterContent) {
      setLoadingContent(true)
      try {
        await api.post(`/ai/starter-content/${taskId}/${index}`)
        const { data } = await api.get(`/tasks/${taskId}`)
        setTask(data.task)
      } catch (error) {
        console.error(error)
      } finally {
        setLoadingContent(false)
      }
    }
  }

  const completeBlock = async (index: number) => {
    await api.patch(`/tasks/${taskId}`, {
      [`defusePlan.sprintBlocks.${index}.completed`]: true,
      [`defusePlan.sprintBlocks.${index}.completedAt`]: new Date().toISOString()
    })

    const { data } = await api.get(`/tasks/${taskId}`)
    setTask(data.task)

    const nextIndex = index + 1
    if (nextIndex < (data.task.defusePlan?.sprintBlocks?.length || 0)) {
      setActiveBlock(nextIndex)
      loadStarterContent(nextIndex)
    }
    setTimerRunning(false)
  }

  const copyContent = () => {
    const content = task?.defusePlan?.sprintBlocks[activeBlock]?.starterContent
    if (!content) return

    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const blocks = task?.defusePlan?.sprintBlocks || []
  const currentBlock = blocks[activeBlock]
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const blockDuration = currentBlock ? currentBlock.durationMinutes * 60 : 1
  const progress = currentBlock ? (1 - timeLeft / blockDuration) * 100 : 0

  if (loading || generating) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="app-surface max-w-md rounded-[2rem] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sr-red/10 text-sr-red">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>
          <p className="mt-5 font-display text-2xl font-semibold text-sr-text">
            {generating ? 'Preparing your focus steps' : 'Loading task'}
          </p>
          <p className="mt-2 text-sm leading-6 text-sr-muted">
            {generating ? 'Defuse is turning this task into small, clearer work blocks.' : 'One moment while we pull your task details.'}
          </p>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="app-surface rounded-[2rem] p-8 text-center">
          <p className="font-display text-2xl font-semibold text-sr-text">Task not found</p>
          <button onClick={() => router.push('/dashboard')} className="mt-4 rounded-full bg-sr-red px-5 py-3 text-sm font-bold text-white">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="app-surface rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={() => router.back()}
                className="mt-1 rounded-full border border-sr-border bg-sr-header p-2 text-sr-muted transition-colors hover:border-sr-red hover:text-sr-red"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-red">Focus Mode</p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-sr-text sm:text-4xl">{task.title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-sr-muted">
                  This page breaks the task into simple work steps so you don&apos;t need to understand a complex sprint system.
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-sr-border bg-sr-header px-5 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-sr-muted">Deadline</p>
              <p className={`mt-2 font-display text-3xl font-bold ${countdown.colorClass} ${countdown.isCritical ? 'countdown-critical' : ''}`}>
                {countdown.display}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <aside className="app-surface rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-muted">Step Plan</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-sr-text">Follow one step at a time</h2>
              </div>
              <span className="rounded-full bg-sr-red/10 px-3 py-1 text-xs font-semibold text-sr-red">
                {blocks.filter((block) => block.completed).length}/{blocks.length} done
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {blocks.map((block, index) => (
                <button
                  key={`${block.title}-${index}`}
                  onClick={() => {
                    setActiveBlock(index)
                    loadStarterContent(index)
                  }}
                  className={`w-full rounded-[1.5rem] border p-4 text-left transition-all ${
                    index === activeBlock
                      ? 'border-sr-red bg-sr-red/5'
                      : block.completed
                      ? 'border-sr-border bg-sr-header opacity-70'
                      : 'border-sr-border bg-sr-card hover:border-sr-red/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      block.completed ? 'bg-sr-green text-white' : index === activeBlock ? 'bg-sr-red text-white' : 'bg-sr-header text-sr-text'
                    }`}>
                      {block.completed ? '✓' : index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sr-text">{block.title}</p>
                      <p className="mt-1 text-sm text-sr-muted">{block.durationMinutes} min</p>
                      <p className="mt-2 text-sm leading-6 text-sr-muted">{block.whatToDo}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex flex-col gap-5">
            {currentBlock ? (
              <>
                <div className="app-surface overflow-hidden rounded-[2rem] p-5 sm:p-6">
                  <div className="absolute" />
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-red">Current Step</p>
                      <h2 className="mt-2 font-display text-3xl font-semibold text-sr-text">{currentBlock.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-sr-muted">{currentBlock.whatToDo}</p>
                    </div>
                    <div className="rounded-[1.75rem] border border-sr-border bg-sr-header px-6 py-5 text-center">
                      <p className="text-xs uppercase tracking-[0.22em] text-sr-muted">Timer</p>
                      <p className={`mt-2 font-display text-5xl font-bold ${timeLeft < 60 ? 'text-sr-red countdown-critical' : 'text-sr-text'}`}>
                        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-sr-header">
                    <div className="h-full rounded-full bg-sr-red transition-all" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => setTimerRunning((value) => !value)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sr-red px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                    >
                      {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {timerRunning ? 'Pause timer' : 'Start timer'}
                    </button>
                    <button
                      onClick={() => completeBlock(activeBlock)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sr-border bg-sr-header px-5 py-3 text-sm font-semibold text-sr-text transition-colors hover:border-sr-green hover:text-sr-green"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark this step done
                    </button>
                  </div>
                </div>

                <div className="app-surface overflow-hidden rounded-[2rem]">
                  <div className="flex flex-col gap-3 border-b border-sr-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-muted">AI Starter Help</p>
                      <p className="mt-1 text-sm text-sr-muted">Use this if you need help getting started with the current step.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={copyContent}
                        className="rounded-full border border-sr-border bg-sr-header px-4 py-2 text-sm font-semibold text-sr-text transition-colors hover:border-sr-red hover:text-sr-red"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Copy className="h-4 w-4" />
                          {copied ? 'Copied' : 'Copy'}
                        </span>
                      </button>
                      <button
                        onClick={() => loadStarterContent(activeBlock)}
                        className="rounded-full border border-sr-border bg-sr-header px-4 py-2 text-sm font-semibold text-sr-text transition-colors hover:border-sr-red hover:text-sr-red"
                      >
                        <span className="inline-flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Refresh
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    {loadingContent ? (
                      <div className="flex h-32 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-sr-red" />
                      </div>
                    ) : currentBlock.starterContent ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-sr-text">
                        {currentBlock.starterContent}
                      </pre>
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-sr-border bg-sr-header px-6 py-12 text-center">
                        <p className="font-display text-2xl font-semibold text-sr-text">No starter content yet</p>
                        <p className="mt-2 text-sm text-sr-muted">Generate a first draft, outline, or helper text for this step.</p>
                        <button
                          onClick={() => loadStarterContent(activeBlock)}
                          className="mt-5 inline-flex items-center gap-2 rounded-full bg-sr-red px-5 py-3 text-sm font-bold text-white"
                        >
                          <Sparkles className="h-4 w-4" />
                          Generate starter help
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
