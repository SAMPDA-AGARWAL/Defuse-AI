const Task = require('../models/Task')
const User = require('../models/User')
const BriefingLog = require('../models/BriefingLog')
const { generateMorningBriefing } = require('../services/ai')
const { sendPushNotification, sendWhatsAppMessage } = require('../services/notifications')

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const generateAndSendBriefing = async (userId) => {
  const user = await User.findById(userId)
  if (!user) return

  const tasks = await Task.find({
    userId,
    status: { $in: ['pending', 'in_progress', 'defusing'] }
  }).sort({ deadline: 1 }).limit(10)

  const dayOfWeek = DAYS[new Date().getDay()]
  const briefing = await generateMorningBriefing(tasks, user.name, dayOfWeek)

  const log = await BriefingLog.create({
    userId,
    type: 'morning',
    content: JSON.stringify(briefing),
    tasksIncluded: tasks.map(t => t._id),
    deliveredVia: []
  })

  const summary = `${briefing.greeting}\n\n${briefing.summary}\n\n🎯 Start with: ${briefing.topPriority?.taskTitle || 'your most urgent task'}`

  if (user.pushSubscription) {
    await sendPushNotification(user.pushSubscription, '☀️ Morning Briefing', summary, { type: 'briefing', logId: log._id.toString() })
    log.deliveredVia.push('push')
  }

  if (user.preferences.notifications.whatsapp && user.preferences.whatsappNumber) {
    await sendWhatsAppMessage(user.preferences.whatsappNumber, `☀️ *DEFUSE Morning Briefing*\n\n${summary}`)
    log.deliveredVia.push('whatsapp')
  }

  await log.save()
  return briefing
}

module.exports = { generateAndSendBriefing }
