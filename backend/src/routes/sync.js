const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const auth = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const { getAuthClientForUser } = require('../services/googleAuth')
const { scanForDeadlines } = require('../services/gmail')
const { getUpcomingEvents, convertEventsToTasks } = require('../services/calendar')
const { extractTasksFromBatch } = require('../services/ai')

// GET /api/sync/gmail?days=30
router.get('/gmail', auth, asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90) // cap at 90 days

  const authClient = await getAuthClientForUser(req.user)
  const emails = await scanForDeadlines(authClient, days)

  if (!emails.length) {
    return res.json({ success: true, emailsScanned: 0, tasksCreated: 0, message: `No deadline emails found in last ${days} days` })
  }

  // Single batch AI call for ALL emails — much faster than one call per email
  const result = await extractTasksFromBatch(emails)
  const extracted = result.tasks || []

  const existingTasks = await Task.find({ userId: req.userId, source: 'gmail' }).select('title')
  const existingTitles = new Set(existingTasks.map(t => t.title.toLowerCase().slice(0, 25)))

  const io = req.app.get('io')
  let tasksCreated = 0

  for (const taskData of extracted) {
    const titleKey = taskData.title.toLowerCase().slice(0, 25)
    if (existingTitles.has(titleKey)) continue

    const task = await Task.create({
      userId: req.userId,
      title: taskData.title,
      description: taskData.description,
      deadline: taskData.deadline ? new Date(taskData.deadline) : null,
      estimatedMinutes: taskData.estimatedMinutes || 60,
      priority: taskData.priority || 'medium',
      source: 'gmail',
      sourceMetadata: { subject: emails[0]?.subject, from: emails[0]?.from }
    })

    existingTitles.add(titleKey)
    io.to(`user:${req.userId}`).emit('task:created', task)
    tasksCreated++
  }

  res.json({ success: true, emailsScanned: emails.length, tasksCreated, daysScanned: days })
}))

// GET /api/sync/calendar?days=14
router.get('/calendar', auth, asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 14, 60)
  const authClient = await getAuthClientForUser(req.user)
  const events = await getUpcomingEvents(authClient, days)
  const taskTemplates = convertEventsToTasks(events)
  const io = req.app.get('io')
  let synced = 0

  for (const template of taskTemplates) {
    const exists = await Task.findOne({
      userId: req.userId,
      'sourceMetadata.calendarEventId': template.sourceMetadata.calendarEventId
    })
    if (exists) continue
    const task = await Task.create({ userId: req.userId, ...template })
    io.to(`user:${req.userId}`).emit('task:created', task)
    synced++
  }

  res.json({ success: true, eventsFound: events.length, synced, daysAhead: days })
}))

// GET /api/sync/status
router.get('/status', auth, asyncHandler(async (req, res) => {
  const [gmailCount, calendarCount] = await Promise.all([
    Task.countDocuments({ userId: req.userId, source: 'gmail' }),
    Task.countDocuments({ userId: req.userId, source: 'calendar' })
  ])
  res.json({ success: true, sources: { gmail: gmailCount, calendar: calendarCount } })
}))

module.exports = router
