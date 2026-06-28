# ⚡ DEFUSE — AI Crisis Manager

> You're already behind. I already know. Let's fix it.

## Quick Start

### Backend
```bash
cd backend
npm install
# Add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to .env
npm run dev
# Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

## What You Need Before Running

1. **Google Cloud Console** → Create OAuth 2.0 credentials
   - Add `http://localhost:5000/api/auth/google/callback` as redirect URI
   - Enable Gmail API + Google Calendar API
   - Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `backend/.env`

2. **Twilio** (optional) → For WhatsApp bot
   - Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` to `backend/.env`

3. All other credentials (MongoDB, Redis, Gemini, OpenAI, Bunny.net) are already in `.env`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/auth/google | Start Google OAuth |
| GET | /api/auth/me | Current user |
| GET | /api/tasks | All tasks (sorted by urgency) |
| POST | /api/tasks | Create task |
| POST | /api/tasks/extract | Extract from screenshot/text |
| POST | /api/ai/defuse/:id | Generate DEFUSE plan |
| POST | /api/ai/battle-plan | Generate full day plan |
| POST | /api/ai/reality-check | Honest time estimate |
| POST | /api/ai/briefing | Morning briefing |
| GET | /api/sync/gmail | Scan Gmail for deadlines |
| GET | /api/sync/calendar | Sync Google Calendar |
| POST | /api/whatsapp/webhook | Twilio WhatsApp hook |

## Deploy to Google Cloud Run

```bash
# Backend
gcloud run deploy defuse-backend \
  --source ./backend \
  --region asia-south1 \
  --allow-unauthenticated

# Frontend  
gcloud run deploy defuse-frontend \
  --source ./frontend \
  --region asia-south1 \
  --allow-unauthenticated
```
