require('dotenv').config()
const { GoogleGenerativeAI } = require('@google/generative-ai')
const OpenAI = require('openai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Redis cache (lazy import to avoid circular dep issues)
let redisClient = null
const getRedis = () => {
  if (!redisClient) {
    try { redisClient = require('../config/db').redisClient } catch {}
  }
  return redisClient
}

const CACHE_TTL = 300 // 5 min

const cacheKey = (prefix, input) => `ai:${prefix}:${Buffer.from(input).toString('base64').slice(0, 60)}`

const fromCache = async (key) => {
  try {
    const r = getRedis()
    if (!r) return null
    const val = await r.get(key)
    return val ? JSON.parse(val) : null
  } catch { return null }
}

const toCache = async (key, val) => {
  try {
    const r = getRedis()
    if (!r) return
    await r.setEx(key, CACHE_TTL, JSON.stringify(val))
  } catch {}
}

const parseJSON = (text) => {
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
    throw new Error('Failed to parse AI response as JSON')
  }
}

const callGemini = async (prompt, { imageBase64, mimeType, maxTokens = 2048 } = {}) => {
  const modelName = imageBase64 ? 'gemini-2.0-flash' : 'gemini-2.0-flash'
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 }
  })
  const parts = imageBase64
    ? [{ text: prompt }, { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } }]
    : [{ text: prompt }]
  const result = await model.generateContent(parts)
  return result.response.text()
}

const callOpenAI = async (prompt, { imageBase64, mimeType, maxTokens = 2048 } = {}) => {
  const messages = imageBase64
    ? [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'low' } }] }]
    : [{ role: 'user', content: prompt }]
  const model = imageBase64 ? 'gpt-4o' : 'gpt-4o-mini'
  const res = await openai.chat.completions.create({ model, messages, max_tokens: maxTokens, temperature: 0.3 })
  return res.choices[0].message.content
}

const callAI = async (prompt, opts = {}) => {
  try {
    const text = await callGemini(prompt, opts)
    return opts.responseFormat === 'json' ? parseJSON(text) : text
  } catch (geminiErr) {
    console.warn('Gemini failed, falling back to OpenAI:', geminiErr.message)
    try {
      const text = await callOpenAI(prompt, opts)
      return opts.responseFormat === 'json' ? parseJSON(text) : text
    } catch (openaiErr) {
      throw new Error(`Both AI providers failed. Gemini: ${geminiErr.message} | OpenAI: ${openaiErr.message}`)
    }
  }
}

const TASK_JSON_FORMAT = `{"tasks":[{"title":"string","description":"string|null","deadline":"ISO datetime|null","deadlineConfidence":"high|medium|low","estimatedMinutes":60,"priority":"critical|high|medium|low","taskType":"study|exam|assignment|work|meeting|payment|health|personal|other"}]}`

const extractTasksFromText = async (text) => {
  const key = cacheKey('extract', text)
  const cached = await fromCache(key)
  if (cached) return cached

  const result = await callAI(
    `Extract ALL tasks/deadlines/commitments. Today: ${new Date().toISOString().slice(0,10)}. Return ONLY JSON: ${TASK_JSON_FORMAT}\n\nText: """${text.slice(0, 3000)}"""`,
    { responseFormat: 'json', maxTokens: 1024 }
  )
  await toCache(key, result)
  return result
}

// Batch-process many email/texts at once — single AI call instead of N calls
const extractTasksFromBatch = async (items) => {
  if (!items.length) return []
  const combined = items.map((item, i) => `[${i + 1}] ${item.subject ? `Subject: ${item.subject}\nFrom: ${item.from}\n` : ''}${item.body || item.text || ''}`).join('\n\n---\n\n')

  const key = cacheKey('batch', combined)
  const cached = await fromCache(key)
  if (cached) return cached

  const result = await callAI(
    `Today: ${new Date().toISOString().slice(0,10)}. Extract ALL tasks/deadlines from these ${items.length} emails/texts. Ignore marketing. Return ONLY JSON: ${TASK_JSON_FORMAT}\n\n${combined.slice(0, 8000)}`,
    { responseFormat: 'json', maxTokens: 2048 }
  )
  await toCache(key, result)
  return result
}

const extractTasksFromImage = async (base64Image, mimeType = 'image/jpeg') => {
  return callAI(
    `Extract ALL tasks/deadlines/assignments from this image. Return ONLY JSON: ${TASK_JSON_FORMAT}`,
    { imageBase64: base64Image, mimeType, responseFormat: 'json', maxTokens: 1024 }
  )
}

const extractTasksFromSyllabus = async (text) => {
  const normalized = text.replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim()
  const key = cacheKey('syllabus', normalized.slice(0, 12000))
  const cached = await fromCache(key)
  if (cached) return cached

  const result = await callAI(
    `You are extracting academic deadlines from a course syllabus.
Today: ${new Date().toISOString().slice(0, 10)}.
Read the FULL syllabus text and extract ALL exams, quizzes, assignments, projects, labs, presentations, submissions, registration dates, and any dated academic deadlines for the entire semester.

Rules:
- Do not skip far-future items.
- If a date is partial but still meaningful, infer the correct year from the syllabus context.
- Prefer concrete deadlines over general weekly class meetings.
- Create one task per deadline.
- Use category "exam" for exams/quizzes/tests, "assignment" for assignments/projects/labs, otherwise "study".
- Keep titles short and student-friendly.
- Return ONLY JSON in this exact format: ${TASK_JSON_FORMAT}

Syllabus text:
"""${normalized.slice(0, 50000)}"""`,
    { responseFormat: 'json', maxTokens: 4096 }
  )

  await toCache(key, result)
  return result
}

const generateBattlePlan = async (tasks, availableHours = 8) => {
  const taskList = tasks.slice(0, 15).map(t =>
    `- ${t.title} (dl: ${t.deadline ? new Date(t.deadline).toISOString() : 'flex'}, est: ${t.estimatedMinutes}m, pri: ${t.priority})`
  ).join('\n')

  return callAI(
    `Create a time-blocked battle plan. Available: ${availableHours}h. Today: ${new Date().toISOString().slice(0,16)}.
Tasks:\n${taskList}
Return ONLY JSON: {"blocks":[{"taskTitle":"str","startTime":"HH:MM","endTime":"HH:MM","durationMinutes":45,"type":"work|break","note":"str"}],"warnings":["str"],"overloaded":false,"totalWorkMinutes":240}`,
    { responseFormat: 'json', maxTokens: 1500 }
  )
}

const generateDefusePlan = async (task, minutesRemaining, percentComplete = 0) => {
  return callAI(
    `Crisis execution plan. Be brutally honest.
Task: "${task.title}" | Desc: "${(task.description || '').slice(0, 200)}"
Time left: ${minutesRemaining}min | Progress: ${percentComplete}%
Generate sprint blocks with starter content for block 1. Include breaks after 45-55min.
Return ONLY JSON: {"feasible":true,"warningMessage":"str|null","sprintBlocks":[{"order":1,"title":"str","durationMinutes":45,"whatToDo":"str","starterContent":"actual outline/draft/code here"}],"totalMinutes":180,"recommendation":"str"}`,
    { responseFormat: 'json', maxTokens: 2500 }
  )
}

const generateStarterContent = async (task, sprintBlock) => {
  return callAI(
    `Generate concrete starter content for this sprint. Give something to START with immediately.
Task: "${task.title}" | Sprint: "${sprintBlock.title}" | Goal: "${sprintBlock.whatToDo}"
Essay/report → outline with headers+bullets. Code → skeleton with comments. Email → full draft. Study → key points structure.
Return ONLY JSON: {"contentType":"outline|draft|skeleton|notes","content":"full starter content","tips":["tip1","tip2"]}`,
    { responseFormat: 'json', maxTokens: 2000 }
  )
}

const realityCheck = async (taskTitle, taskDescription, userEstimateMinutes) => {
  return callAI(
    `Honest time estimate. No optimism.
Task: "${taskTitle}" | Desc: "${(taskDescription || '').slice(0, 300)}" | User estimate: ${userEstimateMinutes}min
Return ONLY JSON: {"aiEstimateMinutes":180,"reasoning":"str","warning":"str|null","suggestions":["tip1","tip2"]}`,
    { responseFormat: 'json', maxTokens: 512 }
  )
}

const generateMorningBriefing = async (tasks, userName, dayOfWeek) => {
  const taskSummary = tasks.slice(0, 8).map(t => {
    const hrs = t.deadline ? Math.round((new Date(t.deadline) - new Date()) / 3600000) : null
    return `- ${t.title} (${t.priority}${hrs !== null ? `, ${hrs}h left` : ''})`
  }).join('\n')

  return callAI(
    `Morning briefing for ${userName} on ${dayOfWeek}. Energetic but realistic. Under 120 words total.
Tasks:\n${taskSummary || 'Clear schedule!'}
Return ONLY JSON: {"greeting":"str","summary":"str","topPriority":{"taskTitle":"str","reason":"str"},"timeBlocks":["str"],"motivationNote":"str"}`,
    { responseFormat: 'json', maxTokens: 512 }
  )
}

const extractTasksFromVoiceTranscript = async (transcript) => {
  return callAI(
    `Voice note → extract tasks. "I need to", "don't forget", "tomorrow I have" = task indicators.
Transcript: "${transcript.slice(0, 2000)}"
Return ONLY JSON: ${TASK_JSON_FORMAT}`,
    { responseFormat: 'json', maxTokens: 1024 }
  )
}

const generateDashboardSummary = async (tasks) => {
  const activeTasks = tasks.filter((task) => task.status !== 'completed')
  if (!activeTasks.length) return ''

  const snapshot = activeTasks
    .slice(0, 20)
    .map((task) => `${task.title}|${task.priority}|${task.status}|${task.deadline ? new Date(task.deadline).toISOString() : 'none'}`)
    .join('\n')
  const key = cacheKey('dashboard-summary', snapshot)
  const cached = await fromCache(key)
  if (cached?.summary) return cached.summary

  const summary = await callAI(
    `You are writing a dashboard summary for a deadline manager.
Today: ${new Date().toISOString().slice(0, 10)}.
Use the real task list below. Mention actual counts and specific upcoming deadlines when useful.
Rules:
- 1 to 3 sentences maximum.
- Mention high-priority items if any exist.
- Do not use markdown.
- Do not invent any tasks or dates.

Tasks:
${activeTasks.slice(0, 20).map((task) => {
      const due = task.deadline ? new Date(task.deadline).toISOString() : 'No deadline'
      return `- ${task.title} | priority: ${task.priority} | status: ${task.status} | due: ${due}`
    }).join('\n')}`,
    { maxTokens: 180 }
  )

  await toCache(key, { summary })
  return summary
}

module.exports = {
  callAI,
  extractTasksFromText,
  extractTasksFromBatch,
  extractTasksFromImage,
  extractTasksFromSyllabus,
  generateBattlePlan,
  generateDefusePlan,
  generateStarterContent,
  realityCheck,
  generateMorningBriefing,
  extractTasksFromVoiceTranscript,
  generateDashboardSummary
}
