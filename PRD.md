# DEFUSE — Product Requirements Document
> AI-Powered Deadline Crisis Manager | Vibe2Ship Hackathon

---

## 1. Executive Summary

**Product Name:** DEFUSE  
**Tagline:** "You're already behind. I already know. Let's fix it."  
**Platform:** Web App (PWA) — works on desktop + installable on Android/iOS  
**Hackathon:** Vibe2Ship (Coding Ninjas × Google for Developers) — Problem 1  

DEFUSE is not a to-do app. It's a Situation Room that watches your Gmail, Calendar, WhatsApp, and screenshots — automatically extracts every commitment and deadline — and intervenes before you miss them with AI-generated battle plans and execution assistance.

---

## 2. The Problem

Students, professionals, and entrepreneurs miss deadlines not because they don't know what's due — but because:

1. Tasks live in 6 different places (WhatsApp, Gmail, voice notes, their head)
2. They don't know what to do NEXT when overwhelmed
3. When panic hits, they freeze at the blank page
4. Reminders are easy to ignore — they need intervention, not a ping

**The insight:** ChatGPT waits for you to ask. DEFUSE already knows you're behind and tells you before you open the app.

---

## 3. Target Users

| Segment | Pain | How DEFUSE Helps |
|---|---|---|
| College Students (18–24) | Deadlines in WhatsApp groups, assignment PDFs, prof emails | Screenshot → auto task, DEFUSE sprint mode |
| School Students (14–18) | Exams mixed with assignments, no planning habit | Simple chat, 3AM panic mode |
| Working Professionals (25–40) | Email deadlines, meeting prep, project milestones | Gmail auto-scan, calendar prep blocks |
| Non-tech users (40+) | Won't download new apps | WhatsApp bot — no app needed |

---

## 4. Core Features

### P0 — Must Ship (Hackathon MVP)

#### F1: Multi-Source Task Extraction
- **Screenshot Upload** — Claude/Gemini Vision reads WhatsApp screenshots, assignment PDFs, emails
- **Text Brain Dump** — paste messy text, AI extracts all tasks + deadlines
- **Voice Dump** — 60-second voice note → AI transcribes + extracts
- **Gmail Auto-Scan** — OAuth read, scan for "due by", "deadline", "please submit", "by Friday"
- **Google Calendar Sync** — Read upcoming events, detect prep time needed

#### F2: Situation Room Dashboard
- Live countdown timers for all active deadlines (updates every second)
- Task cards color-coded: Red (<6hrs), Orange (<24hrs), Green (safe)
- Source badge on each task (Gmail / Calendar / WhatsApp / Manual)
- Proactive AI panel — AI speaks first, warns, suggests action
- "Do This Now" card — always visible, one action at a time

#### F3: DEFUSE Mode (Crisis Execution Engine)
- Triggered by panic button on any task
- AI analyzes task type + time remaining → generates 15-min sprint blocks
- Each sprint block has AI-generated starter content:
  - Essay/report → outline + first paragraph
  - Code → skeleton + pseudocode
  - Email/message → full draft
  - Study → key points summary
- Integrated Pomodoro timer per sprint
- Task co-pilot chat pinned to current sprint

#### F4: Reality Check AI
- User enters estimated time → AI gives honest estimate with reasoning
- "You said 1 hour. This needs 3.5 hrs based on scope. Here's why."
- Automatically adjusts battle plan with realistic timing
- Shows danger zone: "You have 5 hrs, this needs 4. Tight. Start now."

#### F5: AI Battle Plan Generator
- One-click: generate full day plan from all active tasks
- Time-blocked schedule with buffer built in
- Dependency detection: "Research before writing"
- Regenerate with one click if plans change

#### F6: Smart Notifications
- Browser push + WhatsApp via Twilio
- AI-calculated timing: 4hr task = alert 6hrs before, not 30 mins
- Escalating urgency: calm → urgent → panic tone
- Morning briefing: 8am daily summary of the day ahead

### P1 — Strong Add (Build if time allows)

#### F7: WhatsApp Bot
- Twilio number users can forward messages to
- Bot extracts tasks, adds to war room, sends reminders
- Reply "HELP" → get current battle plan on WhatsApp
- Works for non-app users (40+ age group)

#### F8: 3AM Panic Mode
- Dark, calming UI triggered after 11pm
- Gentle AI tone: "I'm here. Let's get through this together."
- Step-by-step micro-guidance, no overwhelming plans
- Soft colors, reduced information density

#### F9: Location-Aware Reminders
- "When I reach college, remind me to submit the form"
- Browser Geolocation API triggers reminder on arrival

### P2 — Post-Hackathon

- Accountability partner sharing
- Streak tracking + habit analytics
- Commitment stakes (consequence if task missed)
- Slack/Teams bot
- Sunday weekly planning session
- Procrastination pattern detection

---

## 5. User Flows

### Flow 1: First-Time User
```
Land on DEFUSE → "Connect accounts to watch your deadlines automatically"
→ Google OAuth (Gmail + Calendar scopes)
→ AI scans in background (10 seconds)
→ Situation Room loads with REAL tasks already populated
→ AI says: "I found 5 items. 2 are urgent. Here's your situation."
→ User amazed → starts using immediately
```

### Flow 2: Screenshot Brain Dump
```
Click camera icon → Upload WhatsApp group screenshot
→ Gemini Vision reads image
→ Extracts: 3 tasks with deadlines and priorities
→ Tasks appear in Situation Room with countdown timers
→ AI suggests: "Start with [Task A] — it's due in 6 hours"
```

### Flow 3: DEFUSE a Task
```
See critical task (red, 6hr countdown)
→ Click "⚡ DEFUSE NOW"
→ AI asks: "What type of task? How much is done?"
→ Reality check: "This needs 4 hrs. You have 6. Here's the plan."
→ Sprint blocks appear: [Research 45min] [Write Sec1 45min] [Write Sec2 45min]...
→ Click first block → AI generates outline/starter content
→ Timer starts → co-pilot chat active
→ Sprint ends → check in → next block
```

### Flow 4: WhatsApp User (Non-tech)
```
Forward any WhatsApp message to Twilio number
→ Bot reads it, extracts task + deadline
→ Bot replies: "Added: Pay electricity bill — remind you on 27th ✓"
→ On deadline day: WhatsApp message with reminder
→ Never opened the app. Full value delivered.
```

---

## 6. Technical Architecture

### Stack Overview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (PWA)                    │
│         Next.js 14 + TailwindCSS + shadcn/ui        │
│              Deployed: Google Cloud Run              │
└──────────────────────┬──────────────────────────────┘
                       │ REST API + WebSockets
┌──────────────────────▼──────────────────────────────┐
│                  BACKEND (Node.js)                   │
│              Express.js + Socket.io                  │
│              Deployed: Google Cloud Run              │
├────────────┬──────────────┬──────────────────────────┤
│  MongoDB   │ Redis Cloud  │    Google Cloud Tasks    │
│  (Atlas)   │  (Cache +    │   (Background Jobs /     │
│  Primary   │   Queue)     │    Scheduled Agents)     │
│  Database  │              │                          │
└────────────┴──────────────┴──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                   AI LAYER                           │
│    Gemini 1.5 Pro (Primary) → OpenAI GPT-4o (FB)   │
│    Gemini Vision for screenshot/image parsing        │
│    Function Calling for Agentic background jobs      │
└─────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                EXTERNAL SERVICES                     │
│  Gmail API │ Google Calendar │ Twilio │ Bunny.net   │
│  Google OAuth │ Browser Push API │ Web Speech API   │
└─────────────────────────────────────────────────────┘
```

### Service Breakdown

| Service | Purpose | Why |
|---|---|---|
| **Next.js 14** | Frontend + API routes for simple endpoints | SSR, PWA support, fast |
| **Node.js + Express** | Main backend API | Team knows it, fast to build |
| **Socket.io** | Real-time countdown updates + live AI responses | Timers need WebSocket |
| **MongoDB Atlas** | Users, tasks, sessions, plans | Flexible schema for varied task types |
| **Redis Cloud** | Session cache, rate limiting, job queue, WebSocket pub/sub | Fast in-memory ops |
| **Google Cloud Run** | Deploy both frontend + backend as containers | Auto-scales, pay per request |
| **Google Cloud Tasks** | Scheduled background agent jobs (Gmail scan, morning briefing) | Reliable cron on GCP |
| **Bunny.net** | Store uploaded screenshots, voice recordings, attachments | Fast CDN, cheap storage |
| **Gemini 1.5 Pro** | Primary AI — text + vision in one model | Free tier generous, fast |
| **OpenAI GPT-4o** | Fallback if Gemini fails or rate limits | Reliability safety net |
| **Twilio** | WhatsApp bot | Industry standard, easy API |
| **Google OAuth** | Auth + Gmail + Calendar access in one token | Single OAuth flow for all |

---

## 7. AI Architecture Decision: Workflow vs Agentic

### The Answer: USE BOTH — Different jobs, different patterns

#### AI Workflows (User-Triggered, Synchronous)
For all features the user explicitly triggers. Fast, predictable, cheap.

```
User Action → API Call → Gemini Prompt → Structured Response → UI Update
```

| Feature | Workflow Steps |
|---|---|
| Screenshot extraction | Image → Gemini Vision → JSON tasks array |
| Battle plan generation | Tasks array → Gemini → time-blocked schedule JSON |
| DEFUSE sprint planning | Task + time left → Gemini → sprint blocks + starter content |
| Reality check | Task description + user estimate → Gemini → honest estimate + reasoning |
| Voice dump parsing | Audio transcript → Gemini → tasks JSON |
| Morning briefing | Today's tasks → Gemini → personalized briefing text |

**Implementation:** Simple async functions. Input → Gemini API → parse JSON output → save to MongoDB → return to frontend.

#### Agentic AI (Background, Autonomous, Tool-Using)
For background jobs that run without user input. AI decides what to do with tools.

```
Cron Trigger → Agent starts → Calls tools → Decides action → Notifies if needed
```

| Agent | Tools Available | What It Decides |
|---|---|---|
| **Gmail Scanner** | search_emails, read_email, create_task, get_existing_tasks | Which emails have deadlines, whether task already exists, whether urgent enough to notify now |
| **Deadline Monitor** | get_tasks, check_time_remaining, calculate_work_needed, send_notification | Whether user needs to be alerted NOW based on task complexity vs time left |
| **Morning Briefing Agent** | get_tasks, get_calendar, get_user_history, send_notification | What to include in briefing, what tone to use, which tasks to highlight |

**Implementation:** Gemini Function Calling. Agent gets a system prompt + available tools (as functions). It calls tools, gets results, decides next step. Runs via Google Cloud Tasks (cron schedule).

```javascript
// Example: Deadline Monitor Agent
const tools = [
  { name: "get_active_tasks", description: "Get all tasks with deadlines" },
  { name: "calculate_urgency", description: "Calculate if task needs intervention now" },
  { name: "send_push_notification", description: "Send urgent alert to user" },
  { name: "send_whatsapp_message", description: "Send WhatsApp alert" }
];
// Gemini decides which tasks are critical and whether to alert
```

#### Rule of Thumb
- User pressed a button → **Workflow AI** (fast response needed)
- Running in background on a schedule → **Agentic AI** (needs judgment)

---

## 8. Data Models (MongoDB)

### User
```json
{
  "_id": "ObjectId",
  "email": "string",
  "name": "string",
  "avatar": "string",
  "googleTokens": {
    "access_token": "encrypted",
    "refresh_token": "encrypted",
    "scope": "gmail calendar"
  },
  "preferences": {
    "morningBriefingTime": "08:00",
    "whatsappNumber": "+91XXXXXXXXXX",
    "workingHours": { "start": "09:00", "end": "23:00" },
    "defaultTaskBuffer": 30
  },
  "stats": {
    "tasksCompleted": 0,
    "deadlinesMissed": 0,
    "currentStreak": 0
  },
  "createdAt": "Date"
}
```

### Task
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "title": "string",
  "description": "string",
  "deadline": "Date",
  "estimatedMinutes": 120,
  "aiEstimatedMinutes": 240,
  "priority": "critical | high | medium | low",
  "status": "pending | in_progress | defusing | completed | missed",
  "source": "gmail | calendar | screenshot | whatsapp | voice | manual",
  "sourceMetadata": {
    "gmailMessageId": "string",
    "calendarEventId": "string",
    "screenshotUrl": "bunny.net URL"
  },
  "defusePlan": {
    "sprintBlocks": [
      {
        "order": 1,
        "title": "Research + Outline",
        "durationMinutes": 45,
        "starterContent": "# Essay Outline\n1. Introduction...",
        "completed": false
      }
    ],
    "generatedAt": "Date"
  },
  "dependencies": ["ObjectId"],
  "tags": ["assignment", "exam", "meeting"],
  "createdAt": "Date",
  "completedAt": "Date"
}
```

### BriefingLog
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "type": "morning | evening | panic_check",
  "content": "string",
  "tasksIncluded": ["ObjectId"],
  "deliveredVia": ["push", "whatsapp"],
  "createdAt": "Date"
}
```

---

## 9. API Design

### Auth
```
POST /api/auth/google          — OAuth callback, store tokens
POST /api/auth/refresh         — Refresh Google token
DELETE /api/auth/logout        — Clear session
```

### Tasks
```
GET    /api/tasks              — Get all active tasks (sorted by urgency)
POST   /api/tasks              — Create task manually
PATCH  /api/tasks/:id          — Update task (status, progress)
DELETE /api/tasks/:id          — Delete task
POST   /api/tasks/extract      — Extract tasks from screenshot/text/voice (multipart)
```

### AI Features
```
POST /api/ai/battle-plan       — Generate full day battle plan
POST /api/ai/defuse/:taskId    — Generate DEFUSE sprint plan for task
POST /api/ai/reality-check     — Get honest time estimate
POST /api/ai/starter-content   — Generate starter content for a sprint block
POST /api/ai/briefing          — Generate on-demand briefing
```

### Data Sources
```
POST /api/sync/gmail           — Trigger manual Gmail scan
GET  /api/sync/calendar        — Sync calendar events to tasks
POST /api/sync/whatsapp        — Twilio webhook for incoming WhatsApp
```

### WebSocket Events (Socket.io)
```
task:updated     — Real-time task status change
task:created     — New task auto-added (from background agent)
alert:urgent     — AI decides this needs immediate attention
briefing:new     — Morning briefing ready
```

---

## 10. File Structure

```
defuse/
├── frontend/                    # Next.js 14 App
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── dashboard/           # Situation Room
│   │   ├── defuse/[taskId]/     # DEFUSE mode per task
│   │   ├── onboarding/          # First-time flow
│   │   └── api/                 # Next.js API routes (simple ones)
│   ├── components/
│   │   ├── situation-room/      # Main dashboard components
│   │   ├── defuse-mode/         # Sprint blocks, timer, co-pilot
│   │   ├── task-cards/          # Countdown cards
│   │   └── ai-panel/            # Proactive AI sidebar
│   └── lib/
│       ├── socket.ts            # Socket.io client
│       └── api.ts               # API client
│
├── backend/                     # Node.js Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── tasks.js
│   │   │   ├── ai.js
│   │   │   └── sync.js
│   │   ├── services/
│   │   │   ├── gemini.js        # Gemini API + OpenAI fallback
│   │   │   ├── gmail.js         # Gmail scanner
│   │   │   ├── calendar.js      # Google Calendar sync
│   │   │   ├── twilio.js        # WhatsApp bot
│   │   │   └── bunny.js         # Asset upload
│   │   ├── agents/
│   │   │   ├── gmailAgent.js    # Agentic Gmail scanner
│   │   │   ├── deadlineAgent.js # Deadline monitor agent
│   │   │   └── briefingAgent.js # Morning briefing agent
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Task.js
│   │   │   └── BriefingLog.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── rateLimit.js     # Redis-based rate limiting
│   │   ├── jobs/                # Google Cloud Tasks handlers
│   │   │   ├── gmailScan.js
│   │   │   ├── deadlineCheck.js
│   │   │   └── morningBriefing.js
│   │   └── app.js
│   └── Dockerfile
│
├── docker-compose.yml           # Local dev
├── cloudbuild.yaml              # Google Cloud Build CI/CD
└── PRD.md                       # This file
```

---

## 11. AI Prompt Strategy

### Task Extraction Prompt
```
You are a deadline extraction engine. Given the following content (could be a WhatsApp screenshot, email, or text dump), extract ALL tasks, deadlines, and commitments.

Return ONLY valid JSON:
{
  "tasks": [
    {
      "title": "short action title",
      "description": "more detail if available",
      "deadline": "ISO datetime or null",
      "deadlineConfidence": "high|medium|low",
      "estimatedMinutes": number,
      "priority": "critical|high|medium|low",
      "taskType": "assignment|meeting|payment|exam|communication|other"
    }
  ]
}
```

### DEFUSE Sprint Planner Prompt
```
You are a crisis execution planner. A user has [X hours] to complete: [task].
They have completed: [Y%].

Generate a realistic sprint plan. Be honest — if it's not possible, say so.
Account for cognitive fatigue (people need breaks every 45-60 min).
Generate starter content for the FIRST sprint block to remove blank-page paralysis.

Return ONLY valid JSON: { sprintBlocks: [...], warningMessage: string|null, starterContent: string }
```

### Agentic Gmail Scanner System Prompt
```
You are a deadline monitoring agent. Your job is to find emails that contain deadlines, tasks, or commitments the user might miss.

You have access to these tools:
- search_emails(query): Search Gmail with a query
- read_email(id): Get full email content
- create_task(task): Add task to user's war room
- check_existing_tasks(): Get tasks already created to avoid duplicates

Scan systematically. Prioritize emails from the last 7 days. 
Only create tasks for REAL deadlines — not newsletters or promotions.
Be conservative — missing a deadline is worse than a false positive.
```

---

## 12. 4-Day Build Plan

### Day 1 — Foundation
- [ ] Project setup (Next.js + Express monorepo)
- [ ] MongoDB + Redis Cloud connection
- [ ] Google OAuth (Gmail + Calendar scopes)
- [ ] Basic Situation Room UI (dark theme, task cards, countdowns)
- [ ] Screenshot upload → Gemini Vision → task extraction
- [ ] Text brain dump → task extraction
- [ ] Tasks CRUD API

### Day 2 — Core AI Features  
- [ ] DEFUSE Mode — sprint block generation
- [ ] AI Starter Content per sprint block
- [ ] Reality Check AI
- [ ] Battle Plan generator
- [ ] Gmail auto-scanner (workflow version first)
- [ ] Google Calendar sync
- [ ] Socket.io real-time countdowns

### Day 3 — Power Features
- [ ] WhatsApp bot (Twilio)
- [ ] Smart push notifications (Browser Push API)
- [ ] Morning briefing (scheduled via Cloud Tasks)
- [ ] Agentic Gmail scanner (with function calling)
- [ ] Deadline Monitor agent
- [ ] 3AM Panic Mode UI
- [ ] Bunny.net for screenshot storage
- [ ] PWA manifest + service worker

### Day 4 — Polish + Deploy
- [ ] Google Cloud Run deployment (frontend + backend)
- [ ] Demo data pre-loaded
- [ ] Mobile responsive polish
- [ ] OpenAI fallback logic
- [ ] Error handling everywhere
- [ ] Practice demo 5 times
- [ ] Record backup video demo

---

## 13. Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Redis
REDIS_URL=redis://...

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# AI
GEMINI_API_KEY=
OPENAI_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Bunny.net
BUNNY_STORAGE_ZONE=
BUNNY_API_KEY=
BUNNY_CDN_URL=

# App
JWT_SECRET=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_URL=
```

---

## 14. Deployment (Google Cloud)

```yaml
# cloudbuild.yaml — Auto CI/CD on git push
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/defuse-backend', './backend']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/defuse-frontend', './frontend']
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'defuse-backend', '--image', 'gcr.io/$PROJECT_ID/defuse-backend', '--region', 'asia-south1', '--allow-unauthenticated']
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'defuse-frontend', '--image', 'gcr.io/$PROJECT_ID/defuse-frontend', '--region', 'asia-south1', '--allow-unauthenticated']
```

**Region:** `asia-south1` (Mumbai) — lowest latency for Indian users

---

## 15. The Pitch (30 seconds)

> "Every productivity app assumes you're organized. DEFUSE is built for the other 95%.
> 
> You connect Gmail and Calendar once. DEFUSE watches them silently. The moment it detects you're behind — before you even open the app — it warns you.
> 
> When you're panicking with 6 hours left, hit DEFUSE. It breaks your task into 15-minute sprints and writes the first draft for you. You never start from a blank page.
> 
> ChatGPT waits for you to ask. DEFUSE already knows. That's the difference."

---

*PRD Version 1.0 | Created for Vibe2Ship Hackathon | June 2026*
