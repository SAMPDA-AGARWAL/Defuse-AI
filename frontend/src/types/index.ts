export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'in_progress' | 'defusing' | 'completed' | 'missed'
export type TaskSource = 'gmail' | 'calendar' | 'pdf' | 'image' | 'screenshot' | 'whatsapp' | 'voice' | 'manual'
export type TaskCategory = 'study' | 'exam' | 'assignment' | 'work' | 'meeting' | 'payment' | 'health' | 'personal' | 'other'
export type SourceStatus = 'connected' | 'not_connected' | 'disconnected' | 'error'

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
  progressPercent?: number
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
  onboardingCompleted?: boolean
  authProviders?: {
    google: boolean
    email: boolean
  }
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
    longestStreak: number
    lastCompletedDay?: string
  }
  sources: {
    gmail: SourceConnection
    calendar: SourceConnection
    pdf: SourceConnection
    image: SourceConnection
    whatsapp: SourceConnection
  }
}

export interface SourceConnection {
  status: SourceStatus
  lastSyncedAt?: string
  lastError?: string
  fileName?: string
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
  dueToday: number
  active: number
  completed: number
  highPriority: number
  overdue: number
  sourceCounts: {
    gmail: number
    calendar: number
    pdf: number
    image: number
    voice: number
    whatsapp: number
    manual: number
  }
  aiSummary?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
}
