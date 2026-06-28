const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const BriefingLog = require('../models/BriefingLog')
const auth = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const OpenAI = require('openai')
const {
  callAI, generateBattlePlan, generateDefusePlan, generateStarterContent,
  realityCheck, generateMorningBriefing, extractTasksFromText, extractTasksFromVoiceTranscript
} = require('../services/ai')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// POST /api/ai/battle-plan
router.post('/battle-plan', auth, asyncHandler(async (req, res) => {
  const tasks = await Task.find({
    userId: req.userId,
    status: { $in: ['pending', 'in_progress'] },
    deadline: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 3600000) }
  }).sort({ deadline: 1 })

  const start = parseInt(req.user.preferences?.workingHoursStart) || 9
  const end = parseInt(req.user.preferences?.workingHoursEnd) || 23
  const plan = await generateBattlePlan(tasks, end - start)

  for (const block of plan.blocks || []) {
    const task = tasks.find(t => t.title === block.taskTitle)
    if (task) {
      task.battlePlanSlot = { startTime: block.startTime, endTime: block.endTime, date: new Date().toISOString().split('T')[0] }
      await task.save()
    }
  }
  res.json({ success: true, plan, generatedAt: new Date() })
}))

// POST /api/ai/defuse/:taskId
router.post('/defuse/:taskId', auth, asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.taskId, userId: req.userId })
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' })

  const minutesRemaining = task.deadline
    ? Math.round((new Date(task.deadline) - new Date()) / 60000)
    : 480

  const result = await generateDefusePlan(task, minutesRemaining, req.body.percentComplete || 0)
  task.defusePlan = { sprintBlocks: result.sprintBlocks, generatedAt: new Date() }
  task.status = 'defusing'
  await task.save()

  const io = req.app.get('io')
  io.to(`user:${req.userId}`).emit('task:updated', task)
  res.json({ success: true, ...result, taskId: task._id })
}))

// POST /api/ai/starter-content/:taskId/:sprintIndex
router.post('/starter-content/:taskId/:sprintIndex', auth, asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.taskId, userId: req.userId })
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' })

  const idx = parseInt(req.params.sprintIndex)
  const sprint = task.defusePlan?.sprintBlocks?.[idx]
  if (!sprint) return res.status(404).json({ success: false, message: 'Sprint block not found' })

  const result = await generateStarterContent(task, sprint)
  task.defusePlan.sprintBlocks[idx].starterContent = result.content
  task.markModified('defusePlan')
  await task.save()
  res.json({ success: true, ...result })
}))

// POST /api/ai/reality-check
router.post('/reality-check', auth, asyncHandler(async (req, res) => {
  const { taskTitle, taskDescription, userEstimateMinutes } = req.body
  const result = await realityCheck(taskTitle, taskDescription, userEstimateMinutes)
  res.json({ success: true, ...result })
}))

// POST /api/ai/extract-text (no auth — used in onboarding)
router.post('/extract-text', asyncHandler(async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ success: false, message: 'No text provided' })
  const result = await extractTasksFromText(text)
  res.json({ success: true, extracted: result.tasks, count: result.tasks?.length || 0 })
}))

// POST /api/ai/voice-extract
router.post('/voice-extract', auth, asyncHandler(async (req, res) => {
  const { transcript } = req.body
  if (!transcript) return res.status(400).json({ success: false, message: 'No transcript provided' })

  const result = await extractTasksFromVoiceTranscript(transcript)
  const created = []
  for (const t of result.tasks || []) {
    const task = await Task.create({
      userId: req.userId, title: t.title, description: t.description,
      deadline: t.deadline ? new Date(t.deadline) : null,
      estimatedMinutes: t.estimatedMinutes || 60,
      priority: t.priority || 'medium',
      category: mapCategory(t.taskType),
      source: 'voice', tags: [t.taskType].filter(Boolean)
    })
    created.push(task)
  }
  const io = req.app.get('io')
  created.forEach(t => io.to(`user:${req.userId}`).emit('task:created', t))
  res.json({ success: true, tasks: created, count: created.length })
}))

// POST /api/ai/briefing
router.post('/briefing', auth, asyncHandler(async (req, res) => {
  const tasks = await Task.find({
    userId: req.userId,
    status: { $in: ['pending', 'in_progress', 'defusing'] }
  }).sort({ deadline: 1 }).limit(10)

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const briefing = await generateMorningBriefing(tasks, req.user.name, days[new Date().getDay()])

  await BriefingLog.create({
    userId: req.userId, type: 'morning',
    content: JSON.stringify(briefing),
    tasksIncluded: tasks.map(t => t._id),
    deliveredVia: ['api']
  })
  res.json({ success: true, briefing })
}))

// POST /api/ai/chat — fast, direct OpenAI, context-aware, can create tasks
router.post('/chat', auth, asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body
  if (!message) return res.status(400).json({ success: false, message: 'No message provided' })

  const tasks = await Task.find({
    userId: req.userId,
    status: { $in: ['pending', 'in_progress', 'defusing'] }
  }).sort({ deadline: 1 }).limit(15)

  const now = new Date()
  const taskContext = tasks.length
    ? tasks.map(t => {
        const hoursLeft = t.deadline ? Math.round((t.deadline - now) / 3600000) : null
        return `• ${t.title} [${t.priority}${t.category !== 'other' ? `, ${t.category}` : ''}${hoursLeft !== null ? `, due in ${hoursLeft}h` : ', no deadline'}]`
      }).join('\n')
    : 'No active tasks.'

  const systemPrompt = `You are a friendly AI assistant for DEFUSE, a deadline manager app. You help students and professionals manage their tasks.

User's active tasks:
${taskContext}

Today: ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}

You CAN create tasks for the user. When the user says something like "Add:", "Remind me to", "I need to do", "Create task:", extract the task details and respond with a JSON block at the END of your message in this exact format:
<create_tasks>[{"title":"...","deadline":"ISO datetime or null","priority":"critical|high|medium|low","category":"study|exam|assignment|work|meeting|payment|health|personal|other","estimatedMinutes":60}]</create_tasks>

Rules:
- Be direct and friendly, like a smart friend. Under 100 words unless explaining something.
- When asked what to do first, look at deadlines and priorities.
- If no tasks are due soon, encourage planning ahead.
- Only include <create_tasks> when the user clearly wants to add something.`

  const msgs = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ]

  // Direct OpenAI call — fast, no Gemini overhead
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: msgs,
    max_tokens: 350,
    temperature: 0.7
  })

  let reply = completion.choices[0].message.content || ''
  let tasksAdded = 0

  // Parse and create any tasks the AI wants to add
  const taskMatch = reply.match(/<create_tasks>([\s\S]*?)<\/create_tasks>/)
  if (taskMatch) {
    reply = reply.replace(/<create_tasks>[\s\S]*?<\/create_tasks>/, '').trim()
    try {
      const toCreate = JSON.parse(taskMatch[1])
      const io = req.app.get('io')
      for (const t of toCreate) {
        const task = await Task.create({
          userId: req.userId,
          title: t.title,
          deadline: t.deadline ? new Date(t.deadline) : null,
          priority: t.priority || 'medium',
          category: mapCategory(t.category),
          estimatedMinutes: t.estimatedMinutes || 60,
          source: 'manual'
        })
        io.to(`user:${req.userId}`).emit('task:created', task)
        tasksAdded++
      }
    } catch (e) {
      console.warn('Task creation from chat failed:', e.message)
    }
  }

  res.json({ success: true, reply: reply.trim(), tasksAdded })
}))

// Map AI taskType strings to our category enum
function mapCategory(taskType) {
  const map = {
    assignment: 'assignment', exam: 'exam', quiz: 'exam',
    meeting: 'meeting', payment: 'payment', bill: 'payment',
    health: 'health', medical: 'health', personal: 'personal',
    work: 'work', study: 'study', class: 'study', lecture: 'study',
    communication: 'personal', other: 'other'
  }
  return map[taskType?.toLowerCase()] || 'other'
}

module.exports = router
