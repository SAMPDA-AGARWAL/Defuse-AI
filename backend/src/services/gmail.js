const { google } = require('googleapis')

const DEADLINE_KEYWORDS = 'subject:(due OR deadline OR submit OR assignment OR reminder OR "by tomorrow" OR urgent OR "action required" OR overdue OR "last date" OR exam OR quiz OR project)'

const scanForDeadlines = async (authClient, days = 30) => {
  const gmail = google.gmail({ version: 'v1', auth: authClient })
  const query = `${DEADLINE_KEYWORDS} newer_than:${days}d`

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50
  })

  if (!res.data.messages?.length) return []

  // Fetch all emails in parallel (much faster than sequential)
  const results = await Promise.allSettled(
    res.data.messages.map(msg => getEmailContent(authClient, msg.id))
  )

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
}

const getEmailContent = async (authClient, messageId) => {
  const gmail = google.gmail({ version: 'v1', auth: authClient })
  const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' })

  const headers = res.data.payload.headers
  const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
  const from = headers.find(h => h.name === 'From')?.value || ''
  const date = headers.find(h => h.name === 'Date')?.value || ''

  let body = ''
  const extractBody = (part) => {
    if (part.body?.data) body += Buffer.from(part.body.data, 'base64').toString('utf-8')
    if (part.parts) part.parts.forEach(extractBody)
  }
  extractBody(res.data.payload)

  // Strip HTML, collapse whitespace, limit to 600 chars per email
  const cleanBody = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600)

  return { messageId, subject, from, date, body: cleanBody }
}

module.exports = { scanForDeadlines, getEmailContent }
