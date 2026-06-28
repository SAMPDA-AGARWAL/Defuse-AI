const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const User = require('../models/User')
const auth = require('../middleware/auth')
const upload = require('../middleware/upload')
const asyncHandler = require('../utils/asyncHandler')
const { extractTasksFromText, extractTasksFromImage } = require('../services/ai')
const { uploadScreenshot } = require('../services/bunny')

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
    { status: 'completed', completedAt: new Date() },
    { new: true }
  )
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' })
  await User.findByIdAndUpdate(req.userId, { $inc: { 'stats.tasksCompleted': 1, 'stats.currentStreak': 1 } })
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
