const { google } = require('googleapis')

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
]

const createOAuthClient = (tokens = null) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  if (tokens) client.setCredentials(tokens)
  return client
}

const getAuthUrl = () => {
  const client = createOAuthClient()
  return client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' })
}

const getTokensFromCode = async (code) => {
  const client = createOAuthClient()
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)

  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data: userInfo } = await oauth2.userinfo.get()

  return { tokens, userInfo }
}

const refreshAccessToken = async (refreshToken) => {
  const client = createOAuthClient({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()
  return credentials
}

const getAuthClientForUser = async (user) => {
  let tokens = user.googleTokens
  if (!tokens?.access_token) throw new Error('No Google tokens for user')

  const client = createOAuthClient(tokens)

  if (tokens.expiry_date && tokens.expiry_date < Date.now() + 60000) {
    const newTokens = await refreshAccessToken(tokens.refresh_token)
    Object.assign(tokens, newTokens)
    await user.updateOne({ googleTokens: tokens })
    client.setCredentials(tokens)
  }

  return client
}

module.exports = { createOAuthClient, getAuthUrl, getTokensFromCode, refreshAccessToken, getAuthClientForUser }
