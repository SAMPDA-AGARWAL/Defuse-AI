const mongoose = require('mongoose')

const sprintBlockSchema = new mongoose.Schema({
  order: Number,
  title: String,
  durationMinutes: Number,
  whatToDo: String,
  starterContent: String,
  completed: { type: Boolean, default: false },
  startedAt: Date,
  completedAt: Date
}, { _id: false })

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  description: String,
  deadline: { type: Date, index: true },
  estimatedMinutes: { type: Number, default: 60 },
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },
  aiEstimatedMinutes: Number,
  aiEstimateReasoning: String,
  priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  category: {
    type: String,
    enum: ['study', 'exam', 'assignment', 'work', 'meeting', 'payment', 'health', 'personal', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'defusing', 'completed', 'missed'],
    default: 'pending'
  },
  source: {
    type: String,
    enum: ['gmail', 'calendar', 'screenshot', 'whatsapp', 'voice', 'manual'],
    default: 'manual'
  },
  sourceMetadata: mongoose.Schema.Types.Mixed,
  defusePlan: {
    sprintBlocks: [sprintBlockSchema],
    generatedAt: Date
  },
  battlePlanSlot: { startTime: String, endTime: String, date: String },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  tags: [String],
  completedAt: Date,
  missedNotificationSent: { type: Boolean, default: false }
}, { timestamps: true })

taskSchema.virtual('urgencyScore').get(function () {
  if (!this.deadline) return 0
  const hoursLeft = (this.deadline - new Date()) / (1000 * 60 * 60)
  const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 }
  return hoursLeft <= 0 ? 999 : ((priorityMap[this.priority] || 1) * 100) / Math.max(hoursLeft, 0.1)
})

taskSchema.pre('save', function (next) {
  if (this.deadline && this.deadline < new Date() && this.status === 'pending') {
    this.status = 'missed'
  }
  next()
})

module.exports = mongoose.model('Task', taskSchema)
