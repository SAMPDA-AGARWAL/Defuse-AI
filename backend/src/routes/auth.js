const express = require('express')
const jwt = require('jsonwebtoken')
const router = express.Router()
const User = require('../models/User')
const { getAuthUrl, getTokensFromCode } = require('../services/googleAuth')
const auth = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')

// GET /api/auth/google — redirect to Google OAuth
router.get('/google', (req, res) => {
  const url = getAuthUrl()
  res.redirect(url)
})

// GET /api/auth/google/callback — exchange code for tokens
router.get('/google/callback', asyncHandler(async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ success: false, message: 'No code provided' })

  const { tokens, userInfo } = await getTokensFromCode(code)

  let user = await User.findOne({ email: userInfo.email })
  const isNew = !user

  if (!user) {
    user = await User.create({
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.picture,
      googleId: userInfo.id,
      googleTokens: tokens
    })
  } else {
    user.googleTokens = tokens
    user.avatar = userInfo.picture
    await user.save()
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  res.redirect(`${frontendUrl}/auth/callback?token=${token}&isNew=${isNew}&userId=${user._id}`)
}))

// GET /api/auth/me
router.get('/me', auth, asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user })
}))

// POST /api/auth/logout
router.post('/logout', auth, (req, res) => {
  res.json({ success: true, message: 'Logged out' })
})

module.exports = router
