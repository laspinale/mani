# ClawBuddy Mani

## Dev setup

1. Copy env template:

```bash
cp .env.example .env.local
```

2. Fill in:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLAWBUDDY_API_URL`
- `CLAWBUDDY_WEBHOOK_SECRET`
- `VITE_AGENT_NAME`
- `VITE_AGENT_EMOJI`

## Task API

The Task Board uses the ClawBuddy task API in development through the Vite proxy:

- browser calls `/api/ai-tasks`
- Vite forwards to `/functions/v1/ai-tasks`
- `CLAWBUDDY_WEBHOOK_SECRET` stays server-side in dev

### Edge Function deployment

This repo now includes a scaffolded Supabase Edge Function:

- `supabase/functions/ai-tasks/index.ts`

Before it can work remotely, you still need to deploy it and set secrets:

```bash
supabase secrets set CLAWBUDDY_WEBHOOK_SECRET=your_secret --workdir .
supabase functions deploy ai-tasks --workdir .
```

The function currently supports:
- task list/get/create/update/delete
- request verification via `x-webhook-secret`

Assignee, subtask, and question flows are scaffolded but still return placeholder responses until backing tables are added.

## Run

```bash
npm install
npm run dev
```
