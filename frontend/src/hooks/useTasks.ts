'use client'
import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { getSocket } from '@/lib/socket'
import type { Task, TaskSummary } from '@/types'

export const useTasks = (userId?: string) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [summary, setSummary] = useState<TaskSummary>({ critical: 0, high: 0, upcoming: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const { data } = await api.get('/tasks')
      setTasks(data.tasks)
      setSummary(data.summary)
      setError(null)
    } catch (err: unknown) {
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 30000)

    const socket = getSocket()
    if (userId) socket.emit('join:user', userId)

    socket.on('task:created', (task: Task) => {
      setTasks(prev => {
        if (prev.find(t => t._id === task._id)) return prev
        return [task, ...prev]
      })
    })

    socket.on('task:updated', (updated: Task) => {
      setTasks(prev => prev.map(t => t._id === updated._id ? updated : t))
    })

    return () => {
      clearInterval(interval)
      socket.off('task:created')
      socket.off('task:updated')
    }
  }, [fetchTasks, userId])

  const criticalTasks = tasks.filter(t => {
    if (!t.deadline || t.status === 'completed' || t.status === 'missed') return false
    return (new Date(t.deadline).getTime() - Date.now()) < 6 * 3600000
  })

  const activeTasks = tasks.filter(t => ['pending', 'in_progress', 'defusing'].includes(t.status))

  return { tasks, activeTasks, criticalTasks, summary, loading, error, refetch: fetchTasks }
}
