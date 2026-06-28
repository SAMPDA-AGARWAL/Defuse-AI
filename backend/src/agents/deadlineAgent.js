const Task = require('../models/Task')
const User = require('../models/User')
const { sendPushNotification, sendWhatsAppMessage } = require('../services/notifications')

const checkDeadlinesForUser = async (userId) => {
  const now = new Date()
  const in6h = new Date(now.getTime() + 6 * 3600000)
  const in24h = new Date(now.getTime() + 24 * 3600000)

  const urgentTasks = await Task.find({
    userId,
    status: { $in: ['pending', 'in_progress', 'defusing'] },
    deadline: { $gte: now, $lte: in24h },
    missedNotificationSent: false
  })

  const user = await User.findById(userId)
  if (!user) return

  for (const task of urgentTasks) {
    const hoursLeft = (task.deadline - now) / 3600000
    const estHours = (task.aiEstimatedMinutes || task.estimatedMinutes || 60) / 60
    const isCritical = hoursLeft < 6
    const isTight = hoursLeft < estHours * 1.5

    if (isCritical || isTight) {
      const msg = `⚡ DEFUSE Alert: "${task.title}" due in ${Math.round(hoursLeft)}h. ${isTight ? 'Tight window — start now!' : 'Critical!'}`

      if (user.pushSubscription) {
        await sendPushNotification(user.pushSubscription, '⚡ DEFUSE Alert', msg, { taskId: task._id.toString() })
      }

      if (user.preferences.notifications.whatsapp && user.preferences.whatsappNumber) {
        await sendWhatsAppMessage(user.preferences.whatsappNumber, msg)
      }

      task.missedNotificationSent = true
      await task.save()
    }
  }

  // Mark overdue tasks as missed
  await Task.updateMany(
    { userId, status: 'pending', deadline: { $lt: now } },
    { status: 'missed' }
  )
}

const runDeadlineCheck = async () => {
  try {
    const users = await User.find({}).select('_id')
    for (const user of users) {
      await checkDeadlinesForUser(user._id).catch(e => console.error(`Deadline check failed for ${user._id}:`, e.message))
    }
    console.log(`✅ Deadline check complete for ${users.length} users`)
  } catch (err) {
    console.error('runDeadlineCheck error:', err)
  }
}

module.exports = { checkDeadlinesForUser, runDeadlineCheck }
