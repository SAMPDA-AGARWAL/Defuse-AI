export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'in_progress' | 'defusing' | 'completed' | 'missed'
export type TaskSource = 'gmail' | 'calendar' | 'screenshot' | 'whatsapp' | 'voice' | 'manual'
export type TaskCategory = 'study' | 'exam' | 'assignment' | 'work' | 'meeting' | 'payment' | 'health' | 'personal' | 'other'

export interface SprintBlock {
  order: number
  title: string
  durationMinutes: number
  whatToDo: string
  starterContent?: string
  completed: boolean
  startedAt?: string
  completedAt?: string
}

export interface Task {
  _id: string
  userId: string
  title: string
  description?: string
  deadline?: string
  estimatedMinutes: number
  aiEstimatedMinutes?: number
  priority: TaskPriority
  category: TaskCategory
  status: TaskStatus
  source: TaskSource
  sourceMetadata?: Record<string, string>
  defusePlan?: {
    sprintBlocks: SprintBlock[]
    generatedAt: string
  }
  battlePlanSlot?: { startTime: string; endTime: string; date: string }
  tags: string[]
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface User {
  _id: string
  email: string
  name: string
  avatar?: string
  preferences: {
    morningBriefingTime: string
    whatsappNumber?: string
    workingHoursStart: string
    workingHoursEnd: string
    notifications: { push: boolean; whatsapp: boolean }
  }
  stats: {
    tasksCompleted: number
    deadlinesMissed: number
    currentStreak: number
  }
}

export interface BattlePlanBlock {
  taskTitle: string
  startTime: string
  endTime: string
  durationMinutes: number
  type: 'work' | 'break'
  note?: string
}

export interface TaskSummary {
  critical: number
  high: number
  upcoming: number
  total: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
}
