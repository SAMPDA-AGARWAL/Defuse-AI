const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const User = require('../models/User')
const auth = require('../middleware/auth')
const upload = require('../middleware/upload')
const asyncHandler = require('../utils/asyncHandler')
const { PDFParse } = require('pdf-parse')
const { extractTasksFromText, extractTasksFromImage, extractTasksFromSyllabus } = require('../services/ai')
const { uploadScreenshot } = require('../services/bunny')

const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low']
const VALID_CATEGORIES = ['study', 'exam', 'assignment', 'work', 'meeting', 'payment', 'health', 'personal', 'other']

const createReviewedSyllabusTasks = async ({ userId, reviewedTasks, originalFileName }) => {
  const cleanedTasks = reviewedTasks
    .filter(task => task && `${task.title || ''}`.trim())
    .map(task => ({
      userId,
      title: `${task.title}`.trim(),
      description: `${task.description || 'Imported from syllabus scan'}`.trim(),
      deadline: task.deadline ? new Date(task.deadline) : null,
      estimatedMinutes: Number(task.estimatedMinutes) || 90,
      priority: VALID_PRIORITIES.includes(task.priority) ? task.priority : 'medium',
      category: VALID_CATEGORIES.includes(task.category || task.taskType)
        ? (task.category || task.taskType)
        : 'study',
      source: 'manual',
      sourceMetadata: {
        importType: 'syllabus_pdf',
        originalFileName
      },
      tags: ['syllabus', task.category || task.taskType].filter(Boolean)
    }))

  const created = []
  for (const taskData of cleanedTasks) {
    const task = await Task.create(taskData)
    created.push(task)
  }
  return created
}

// GET /api/tasks
router.get('/', auth, asyncHandler(async (req, res) => {
  const { status, priority, category } = req.query
  const filter = { userId: req.userId }

  if (status) filter.status = { $in: status.split(',') }
  if (priority) filter.priority = { $in: priority.split(',') }
  if (category) filter.category = category

  const tasks = await Task.find(filter).sort({ deadline: 1, createdAt: -1 })
  const now = new Date()
  const summary = {
    critical: tasks.filter(t => t.deadline && (t.deadline - now) < 6 * 3600000 && t.status !== 'completed').length,
    high: tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length,
    upcoming: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    total: tasks.length
  }
  res.json({ success: true, tasks, summary })
}))

// POST /api/tasks
router.post('/', auth, asyncHandler(async (req, res) => {
  const { title, description, deadline, estimatedMinutes, priority, tags, category } = req.body
  const task = await Task.create({
    userId: req.userId,
    title, description, priority: priority || 'medium',
    deadline: deadline ? new Date(deadline) : null,
    estimatedMinutes: estimatedMinutes || 60,
    tags: tags || [],
    category: category || 'other',
    source: 'manual'
  })
  const io = req.app.get('io')
  io.to(`user:${req.userId}`).emit('task:created', task)
  res.status(201).json({ success: true, task })
}))

// POST /api/tasks/extract — requires auth so userId is always present
router.post('/extract', auth, upload.single('file'), asyncHandler(async (req, res) => {
  let result

  if (req.file) {
    const base64 = req.file.buffer.toString('base64')
    result = await extractTasksFromImage(base64, req.file.mimetype)
    try {
      const url = await uploadScreenshot(req.file.buffer, req.file.originalname, req.file.mimetype)
      result._screenshotUrl = url
    } catch (e) {
      console.warn('Bunny upload failed:', e.message)
    }
  } else if (req.body.text) {
    result = await extractTasksFromText(req.body.text)
  } else {
    return res.status(400).json({ success: false, message: 'Provide file or text' })
  }

  const created = []
  for (const taskData of (result.tasks || [])) {
    const task = await Task.create({
      userId: req.userId,
      title: taskData.title,
      description: taskData.description || '',
      deadline: taskData.deadline ? new Date(taskData.deadline) : null,
      estimatedMinutes: taskData.estimatedMinutes || 60,
      priority: taskData.priority || 'medium',
      category: taskData.taskType || 'other',
      source: req.file ? 'screenshot' : 'manual',
      sourceMetadata: result._screenshotUrl ? { screenshotUrl: result._screenshotUrl } : {},
      tags: [taskData.taskType].filter(Boolean)
    })
    created.push(task)
  }

  const io = req.app.get('io')
  created.forEach(t => io.to(`user:${req.userId}`).emit('task:created', t))

  res.json({ success: true, tasks: created, count: created.length })
}))

// POST /api/tasks/scan-syllabus
router.post('/scan-syllabus', auth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a syllabus PDF.' })
  }

  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ success: false, message: 'Only PDF syllabus files are supported.' })
  }

  const save = `${req.body.save}` === 'true'
  const parser = new PDFParse({ data: req.file.buffer })
  const pdf = await parser.getText()
  await parser.destroy()
  const syllabusText = (pdf.text || '').trim()

  if (!syllabusText) {
    return res.status(400).json({ success: false, message: 'Could not read any text from this PDF.' })
  }

  const extraction = await extractTasksFromSyllabus(syllabusText)
  const extractedTasks = extraction.tasks || []

  if (!save) {
    return res.json({
      success: true,
      preview: true,
      count: extractedTasks.length,
      tasks: extractedTasks
    })
  }

  const created = await createReviewedSyllabusTasks({
    userId: req.userId,
    reviewedTasks: extractedTasks,
    originalFileName: req.file.originalname
  })

  const io = req.app.get('io')
  created.forEach((task) => io.to(`user:${req.userId}`).emit('task:created', task))

  res.json({
    success: true,
    preview: false,
    count: created.length,
    tasks: created
  })
}))

// POST /api/tasks/scan-syllabus/save
router.post('/scan-syllabus/save', auth, asyncHandler(async (req, res) => {
  const reviewedTasks = typeof req.body.reviewedTasks === 'string'
    ? JSON.parse(req.body.reviewedTasks)
    : req.body.reviewedTasks

  if (!Array.isArray(reviewedTasks) || !reviewedTasks.length) {
    return res.status(400).json({ success: false, message: 'No reviewed syllabus tasks were provided.' })
  }

  const originalFileName = req.body.originalFileName || 'syllabus.pdf'
  const nonEmptyTasks = reviewedTasks.filter(task => task && `${task.title || ''}`.trim())

  if (!nonEmptyTasks.length) {
    return res.status(400).json({ success: false, message: 'All reviewed syllabus tasks were empty.' })
  }

  const created = await createReviewedSyllabusTasks({
    userId: req.userId,
    reviewedTasks,
    originalFileName
  })

  const io = req.app.get('io')
  created.forEach((task) => io.to(`user:${req.userId}`).emit('task:created', task))

  res.json({
    success: true,
    count: created.length,
    tasks: created
  })
}))

// GET /api/tasks/:id
router.get('/:id', auth, asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.userId })
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' })
  res.json({ success: true, task })
}))

// PATCH /api/tasks/:id
router.patch('/:id', auth, asyncHandler(async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true, runValidators: false }
  )
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' })
  const io = req.app.get('io')
  io.to(`user:${req.userId}`).emit('task:updated', task)
  res.json({ success: true, task })
}))

// POST /api/tasks/:id/complete
router.post('/:id/complete', auth, asyncHandler(async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { status: 'completed', completedAt: new Date(), progressPercent: 100 },
    { new: true }
  )
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' })

  const user = await User.findById(req.userId)
  if (user) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastCompletedDay = user.stats?.lastCompletedDay ? new Date(user.stats.lastCompletedDay) : null
    const lastDay = lastCompletedDay
      ? new Date(lastCompletedDay.getFullYear(), lastCompletedDay.getMonth(), lastCompletedDay.getDate())
      : null

    let currentStreak = user.stats?.currentStreak || 0
    if (!lastDay) {
      currentStreak = 1
    } else {
      const diffDays = Math.round((today.getTime() - lastDay.getTime()) / 86400000)
      if (diffDays === 0) {
        currentStreak = user.stats?.currentStreak || 1
      } else if (diffDays === 1) {
        currentStreak = (user.stats?.currentStreak || 0) + 1
      } else {
        currentStreak = 1
      }
    }

    user.stats.tasksCompleted = (user.stats?.tasksCompleted || 0) + 1
    user.stats.currentStreak = currentStreak
    user.stats.longestStreak = Math.max(user.stats?.longestStreak || 0, currentStreak)
    user.stats.lastCompletedDay = today
    await user.save()

    const io = req.app.get('io')
    io.to(`user:${req.userId}`).emit('user:stats', user.stats)
  }

  const io = req.app.get('io')
  io.to(`user:${req.userId}`).emit('task:updated', task)
  res.json({ success: true, task })
}))

// DELETE /api/tasks/:id
router.delete('/:id', auth, asyncHandler(async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  const io = req.app.get('io')
  io.to(`user:${req.userId}`).emit('task:deleted', { id: req.params.id })
  res.json({ success: true })
}))

module.exports = router
