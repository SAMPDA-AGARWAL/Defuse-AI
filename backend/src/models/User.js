const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  passwordHash: String,
  avatar: String,
  googleId: String,
  authProviders: {
    google: { type: Boolean, default: false },
    email: { type: Boolean, default: false }
  },
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
  onboardingCompleted: { type: Boolean, default: false },
  sources: {
    gmail: {
      status: { type: String, enum: ['connected', 'not_connected', 'disconnected', 'error'], default: 'not_connected' },
      lastSyncedAt: Date,
      lastError: String
    },
    calendar: {
      status: { type: String, enum: ['connected', 'not_connected', 'disconnected', 'error'], default: 'not_connected' },
      lastSyncedAt: Date,
      lastError: String
    },
    pdf: {
      status: { type: String, enum: ['connected', 'not_connected', 'disconnected', 'error'], default: 'not_connected' },
      lastSyncedAt: Date,
      lastError: String,
      fileName: String
    },
    image: {
      status: { type: String, enum: ['connected', 'not_connected', 'disconnected', 'error'], default: 'not_connected' },
      lastSyncedAt: Date,
      lastError: String,
      fileName: String
    },
    whatsapp: {
      status: { type: String, enum: ['connected', 'not_connected', 'disconnected', 'error'], default: 'not_connected' },
      lastSyncedAt: Date,
      lastError: String
    }
  },
  pushSubscription: mongoose.Schema.Types.Mixed
}, { timestamps: true })

userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.googleTokens
  delete obj.passwordHash
  return obj
}

module.exports = mongoose.model('User', userSchema)
