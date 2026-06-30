const express = require('express')
const jwt = require('jsonwebtoken')
const router = express.Router()
const User = require('../models/User')
const { getAuthUrl, getTokensFromCode } = require('../services/googleAuth')
const auth = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const { hashPassword, verifyPassword } = require('../utils/password')

const issueToken = (user) => jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

const getFrontendRedirect = (returnTo, token, isNew, userId, onboardingCompleted) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  const path = returnTo === 'home' ? '/' : '/auth/callback'
  const params = new URLSearchParams({
    token,
    isNew: `${isNew}`,
    userId: `${userId}`,
    onboardingCompleted: `${!!onboardingCompleted}`
  })
  return `${frontendUrl}${path}?${params.toString()}`
}

const mergeNested = (base, patch) => {
  const next = { ...(base || {}) }
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      next[key] = mergeNested(next[key], value)
    } else {
      next[key] = value
    }
  })
  return next
}

// GET /api/auth/google — redirect to Google OAuth
router.get('/google', (req, res) => {
  const returnTo = req.query.returnTo === 'home' ? 'home' : 'callback'
  const url = getAuthUrl(returnTo)
  res.redirect(url)
})

// GET /api/auth/google/callback — exchange code for tokens
router.get('/google/callback', asyncHandler(async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ success: false, message: 'No code provided' })

  const returnTo = req.query.state === 'home' ? 'home' : 'callback'
  const { tokens, userInfo } = await getTokensFromCode(code)

  let user = await User.findOne({ email: userInfo.email })
  const isNew = !user

  if (!user) {
    user = await User.create({
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.picture,
      googleId: userInfo.id,
      googleTokens: tokens,
      authProviders: { google: true, email: false },
      sources: {
        gmail: { status: 'connected' },
        calendar: { status: 'connected' }
      }
    })
  } else {
    user.googleTokens = tokens
    user.avatar = userInfo.picture
    user.googleId = userInfo.id
    user.authProviders = mergeNested(user.authProviders?.toObject ? user.authProviders.toObject() : user.authProviders, {
      google: true
    })
    user.sources = mergeNested(user.sources?.toObject ? user.sources.toObject() : user.sources, {
      gmail: { status: 'connected', lastError: '' },
      calendar: { status: 'connected', lastError: '' }
    })
    await user.save()
  }

  const token = issueToken(user)
  res.redirect(getFrontendRedirect(returnTo, token, isNew, user._id, user.onboardingCompleted))
}))

// POST /api/auth/signup
router.post('/signup', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' })
  }

  const normalizedEmail = `${email}`.trim().toLowerCase()
  const existingUser = await User.findOne({ email: normalizedEmail })
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'An account with that email already exists.' })
  }

  const user = await User.create({
    name: `${name || normalizedEmail.split('@')[0]}`.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    authProviders: { google: false, email: true }
  })

  const token = issueToken(user)
  res.status(201).json({ success: true, token, user, onboardingCompleted: user.onboardingCompleted })
}))

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' })
  }

  const user = await User.findOne({ email: `${email}`.trim().toLowerCase() })
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' })
  }

  user.authProviders = mergeNested(user.authProviders?.toObject ? user.authProviders.toObject() : user.authProviders, {
    email: true
  })
  await user.save()

  const token = issueToken(user)
  res.json({ success: true, token, user, onboardingCompleted: user.onboardingCompleted })
}))

// POST /api/auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' })
  }

  res.json({
    success: true,
    message: 'If that account exists, password reset instructions will be available in a future update.'
  })
}))

// GET /api/auth/me
router.get('/me', auth, asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user })
}))

// PATCH /api/auth/me
router.patch('/me', auth, asyncHandler(async (req, res) => {
  const { name, onboardingCompleted, preferences, sources } = req.body

  if (typeof name === 'string' && name.trim()) {
    req.user.name = name.trim()
  }

  if (typeof onboardingCompleted === 'boolean') {
    req.user.onboardingCompleted = onboardingCompleted
  }

  if (preferences && typeof preferences === 'object') {
    req.user.preferences = mergeNested(
      req.user.preferences?.toObject ? req.user.preferences.toObject() : req.user.preferences,
      preferences
    )
  }

  if (sources && typeof sources === 'object') {
    req.user.sources = mergeNested(
      req.user.sources?.toObject ? req.user.sources.toObject() : req.user.sources,
      sources
    )
  }

  await req.user.save()
  res.json({ success: true, user: req.user })
}))

// POST /api/auth/logout
router.post('/logout', auth, (req, res) => {
  res.json({ success: true, message: 'Logged out' })
})

module.exports = router
