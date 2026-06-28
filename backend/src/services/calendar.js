const { google } = require('googleapis')

const getUpcomingEvents = async (authClient, days = 14) => {
  const calendar = google.calendar({ version: 'v3', auth: authClient })

  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50
  })

  return (res.data.items || []).map(event => ({
    eventId: event.id,
    title: event.summary || 'Untitled Event',
    description: event.description || '',
    startDateTime: event.start?.dateTime || event.start?.date,
    endDateTime: event.end?.dateTime || event.end?.date,
    location: event.location || ''
  }))
}

const convertEventsToTasks = (events) => {
  return events.map(event => ({
    title: event.title,
    description: event.description,
    deadline: event.startDateTime,
    estimatedMinutes: 60,
    priority: 'medium',
    source: 'calendar',
    sourceMetadata: { calendarEventId: event.eventId },
    tags: ['meeting', 'calendar']
  }))
}

module.exports = { getUpcomingEvents, convertEventsToTasks }
