const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const User = require('../models/User')
const { extractTasksFromText } = require('../services/ai')

// POST /api/whatsapp/webhook — Twilio sends incoming messages here
router.post('/webhook', async (req, res) => {
  const { Body, From } = req.body
  if (!Body || !From) return res.status(400).end()

  const phoneNumber = From.replace('whatsapp:', '')

  let twimlResponse = ''
  try {
    const user = await User.findOne({ 'preferences.whatsappNumber': phoneNumber })

    if (!user) {
      twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Hi! Connect your account at defuse.app to use the WhatsApp bot 🔗</Message></Response>`
      return res.type('text/xml').send(twimlResponse)
    }

    const cmd = Body.trim().toUpperCase()

    if (cmd === 'HELP' || cmd === 'STATUS' || cmd === 'TASKS') {
      const tasks = await Task.find({
        userId: user._id,
        status: { $in: ['pending', 'in_progress', 'defusing'] },
        deadline: { $gte: new Date() }
      }).sort({ deadline: 1 }).limit(5)

      if (!tasks.length) {
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ You're clear! No pending deadlines. 🎉</Message></Response>`
      } else {
        const list = tasks.map((t, i) => {
          const h = t.deadline ? Math.round((new Date(t.deadline) - new Date()) / 3600000) : null
          return `${i + 1}. ${t.title}${h !== null ? ` → ${h}h left` : ''} (${t.priority})`
        }).join('\n')
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>⚡ DEFUSE Status:\n\n${list}\n\nReply HELP anytime.</Message></Response>`
      }
    } else {
      const result = await extractTasksFromText(Body)
      const created = []

      for (const t of (result.tasks || [])) {
        const task = await Task.create({
          userId: user._id,
          title: t.title, description: t.description,
          deadline: t.deadline ? new Date(t.deadline) : null,
          estimatedMinutes: t.estimatedMinutes || 60,
          priority: t.priority || 'medium',
          source: 'whatsapp'
        })
        created.push(task)
      }

      if (created.length) {
        const list = created.map(t => `✓ ${t.title}`).join('\n')
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Added ${created.length} task(s) to your war room:\n${list}\n\nReply HELP for status.</Message></Response>`
      } else {
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>No tasks found in that message. Try forwarding something with a deadline 📝</Message></Response>`
      }
    }
  } catch (err) {
    console.error('WhatsApp webhook error:', err)
    twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Something went wrong. Try again! 🔄</Message></Response>`
  }

  res.type('text/xml').send(twimlResponse)
})

module.exports = router
