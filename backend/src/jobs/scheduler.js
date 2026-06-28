const cron = require('node-cron')
const { runDeadlineCheck } = require('../agents/deadlineAgent')
const { generateAndSendBriefing } = require('../agents/briefingAgent')
const User = require('../models/User')

const startScheduler = () => {
  // Every 30 minutes: check deadlines
  cron.schedule('*/30 * * * *', async () => {
    console.log('🤖 Running deadline check...')
    await runDeadlineCheck()
  })

  // Every day at 8am: send morning briefings
  cron.schedule('0 8 * * *', async () => {
    console.log('☀️ Sending morning briefings...')
    const users = await User.find({ 'preferences.notifications.push': true }).select('_id')
    for (const user of users) {
      try { await generateAndSendBriefing(user._id) } catch (e) { console.error('Briefing failed:', e.message) }
    }
  })

  console.log('✅ Scheduler started (deadline check every 30min, briefing at 8am)')
}

module.exports = { startScheduler }
