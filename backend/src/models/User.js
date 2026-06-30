const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  avatar: String,
  googleId: String,
  googleTokens: {
    access_token: String,
    refresh_token: String,
    expiry_date: Number,
    scope: String
  },
  preferences: {
    morningBriefingTime: { type: String, default: '08:00' },
    whatsappNumber: String,
    workingHoursStart: { type: String, default: '09:00' },
    workingHoursEnd: { type: String, default: '23:00' },
    defaultTaskBuffer: { type: Number, default: 30 },
    notifications: {
      push: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false }
    }
  },
  stats: {
    tasksCompleted: { type: Number, default: 0 },
    deadlinesMissed: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCompletedDay: Date
  },
  pushSubscription: mongoose.Schema.Types.Mixed
}, { timestamps: true })

userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.googleTokens
  return obj
}

module.exports = mongoose.model('User', userSchema)
