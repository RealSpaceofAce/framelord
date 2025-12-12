# FrameLord Deployment Guide

This document covers deploying FrameLord to Vercel with secure API key handling.

## Architecture Overview

FrameLord uses Vercel serverless functions to proxy all LLM API calls. This ensures:

- **API keys are never exposed to the browser**
- **Keys exist only in server-side environment variables**
- **No VITE_* prefixed secrets in production**

```
Browser                    Vercel Edge                External APIs
   │                           │                           │
   │  POST /api/openai-chat    │                           │
   ├──────────────────────────>│                           │
   │                           │  POST api.openai.com     │
   │                           ├──────────────────────────>│
   │                           │  (with OPENAI_API_KEY)    │
   │                           │<──────────────────────────│
   │<──────────────────────────│                           │
   │  { text: "..." }          │                           │
```

## API Proxy Routes

| Client calls           | Proxy route              | Server env var       |
|------------------------|--------------------------|----------------------|
| OpenAI Chat            | `/api/openai-chat`       | `OPENAI_API_KEY`     |
| OpenAI Whisper         | `/api/openai-transcribe` | `OPENAI_API_KEY`     |
| Gemini Analysis        | `/api/gemini-analyze`    | `GEMINI_API_KEY`     |
| Gemini Chat            | `/api/gemini-chat`       | `GEMINI_API_KEY`     |
| NanoBanana Annotation  | `/api/nanobanana-annotate` | `NANOBANANA_API_KEY` |

## Environment Variables

### Required for Production (Vercel Dashboard)

Set these in Vercel Project Settings > Environment Variables:

```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
NANOBANANA_API_KEY=nb_...
```

### DEPRECATED Variables (Do Not Use)

The following `VITE_*` prefixed variables are deprecated and should NOT be set:

```
VITE_OPENAI_API_KEY     # DEPRECATED - exposed to browser!
VITE_NANOBANANA_API_KEY # DEPRECATED - exposed to browser!
```

These were the old pattern where API keys were bundled into the client. This is a security risk and has been replaced with server-side proxy functions.

## Deployment Steps

### 1. Link to Vercel

```bash
vercel link
```

### 2. Set Environment Variables

```bash
# Production environment
vercel env add OPENAI_API_KEY production
vercel env add GEMINI_API_KEY production
vercel env add NANOBANANA_API_KEY production

# Preview environment (optional, for PR deployments)
vercel env add OPENAI_API_KEY preview
vercel env add GEMINI_API_KEY preview
vercel env add NANOBANANA_API_KEY preview
```

Or set them in the Vercel Dashboard:
1. Go to Project Settings > Environment Variables
2. Add each variable for Production (and optionally Preview)
3. Do NOT check "Expose to client" checkbox

### 3. Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

## Local Development

For local development, the proxy functions won't work with `npm run dev` since Vite doesn't run them.

### Option A: Use Vercel Dev (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Create .env file (gitignored)
echo "OPENAI_API_KEY=sk-..." >> .env
echo "GEMINI_API_KEY=AIza..." >> .env

# Run with Vercel dev server
vercel dev
```

This runs both Vite and the API functions locally.

### Option B: Direct API Calls (Not Recommended)

For quick local testing, you can temporarily use VITE_* env vars, but:

1. Never commit .env files
2. Never deploy with VITE_* secrets
3. Use this only for isolated local testing

## Verifying Deployment

After deployment, verify API keys are not exposed:

```bash
# Check the deployed bundle for leaked keys
curl -s https://your-app.vercel.app/assets/index-*.js | grep -i "sk-"
curl -s https://your-app.vercel.app/assets/index-*.js | grep -i "api_key"
curl -s https://your-app.vercel.app/assets/index-*.js | grep -i "AIza"

# Should return nothing if keys are properly server-side
```

## Troubleshooting

### "API key not configured" Error

The proxy function couldn't find the required environment variable.

1. Check Vercel Dashboard > Project > Settings > Environment Variables
2. Ensure the variable is set for the correct environment (Production/Preview)
3. Redeploy after adding variables

### CORS Errors

The API proxies should not have CORS issues since they're same-origin requests to `/api/*`.

If you see CORS errors:
1. Check browser network tab for the actual endpoint being called
2. Ensure client code is calling `/api/*` not direct external APIs
3. Check for any remaining `api.openai.com` or `generativelanguage.googleapis.com` in client code

### 500 Errors from Proxy

Check Vercel Function logs:
1. Go to Vercel Dashboard > Project > Functions
2. Click on the function that errored
3. View logs to see the actual error

Common issues:
- Invalid API key format
- API quota exceeded
- Malformed request body

## Security Checklist

Before deploying to production:

- [ ] No `VITE_*` secrets in .env.production
- [ ] No API keys hardcoded in source files
- [ ] All LLM calls go through `/api/*` proxies
- [ ] .env files are in .gitignore
- [ ] No commits containing API keys in git history
- [ ] Vercel env vars are set without "Expose to client"

## File Structure

```
/api/                          # Vercel serverless functions
  openai-chat.ts               # Chat completions proxy
  openai-transcribe.ts         # Whisper transcription proxy
  gemini-analyze.ts            # Gemini frame analysis proxy
  gemini-chat.ts               # Gemini chat proxy
  nanobanana-annotate.ts       # Image annotation proxy

/src/lib/llm/                  # Client-side LLM modules
  openaiClient.ts              # Calls /api/openai-chat
  geminiService.ts             # Calls /api/gemini-*
  nanobananaClient.ts          # Calls /api/nanobanana-annotate
  providers.ts                 # Provider type definitions

/src/services/
  transcriptionService.ts      # Calls /api/openai-transcribe
```
