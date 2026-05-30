# "What Did I Build?" — Design Spec
**Date:** 2026-05-30
**Status:** Approved

---

## Overview

A single-page web app that takes a GitHub repo URL or pasted code and generates polished marketing and documentation outputs: a README, landing page copy, a tweet thread, and a Product Hunt pitch. Built for developers who build things but struggle to explain them.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| AI | Anthropic SDK (Claude) |
| GitHub data | Octokit (GitHub REST API) |
| Email delivery | Resend (free tier) |
| Deployment | Vercel |

**Prerequisites for running locally:**
- Node.js installed
- Anthropic API key (`ANTHROPIC_API_KEY` in `.env.local`)
- GitHub personal access token (`GITHUB_TOKEN` in `.env.local`) — optional but increases rate limits
- Resend API key (`RESEND_API_KEY` in `.env.local`) — for email delivery

---

## Architecture

Single Next.js project. No database. No auth. Fully stateless.

```
app/
├── page.tsx                  ← entire UI
├── api/
│   └── generate/
│       └── route.ts          ← GitHub fetching + Claude calls
├── layout.tsx                ← theme provider, fonts
└── globals.css

components/
├── InputSection.tsx          ← URL / Paste tab switcher + input field
├── OutputSelector.tsx        ← checkboxes for 4 output types
├── ResultsSection.tsx        ← tabbed output cards with copy/download buttons
├── DeliverySection.tsx       ← email input + Send button, Download All button
└── ThemeToggle.tsx           ← light/dark toggle in header

app/api/
├── generate/route.ts         ← GitHub fetching + Claude calls
└── email/route.ts            ← Resend email delivery
```

### Data Flow

1. User enters a GitHub URL or pastes code
2. User checks one or more desired outputs
3. User clicks **Generate**
4. Frontend POSTs to `/api/generate`:
   ```json
   {
     "inputType": "url" | "paste",
     "input": "<url or raw code>",
     "selectedOutputs": ["readme", "landing", "tweet", "producthunt"]
   }
   ```
5. API route processes input:
   - **URL path:** Octokit fetches `README.md`, `package.json` / `requirements.txt` / `Cargo.toml`, and up to 5 root-level source files. Total context capped at ~15k tokens.
   - **Paste path:** raw code used directly
6. One Claude call fires per selected output, each with a focused prompt
7. Results stream back as each call completes; tabs appear one by one

---

## UI Layout

```
┌─────────────────────────────────────────┐
│  WhatDidIBuild              [☀️ / 🌙]   │  ← header + theme toggle
├─────────────────────────────────────────┤
│                                         │
│  "Paste your repo. Get your pitch."     │  ← hero tagline
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [GitHub URL]  [Paste Code]      │   │  ← tab switcher
│  │                                 │   │
│  │  https://github.com/...         │   │  ← input (URL or textarea)
│  └─────────────────────────────────┘   │
│                                         │
│  Generate:                              │
│  ☑ README.md      ☑ Landing Page       │  ← output checkboxes
│  ☑ Tweet Thread   ☑ Product Hunt Pitch │
│                                         │
│       [ ✨ Generate ]                   │  ← CTA (disabled until valid)
│                                         │
├─────────────────────────────────────────┤
│  [README] [Landing Page] [Tweet] [PH]  │  ← result tabs (selected only)
│  ┌─────────────────────────────────┐   │
│  │  ...generated content...        │   │
│  │                           [Copy]│   │  ← copy to clipboard
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📧 your@email.com   [Send All] │   │  ← email delivery
│  │  [⬇ Download All as .zip]       │   │  ← download all as zip
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**UX rules:**
- Generate button is disabled until: input is non-empty AND at least one output is checked
- During generation: button shows a spinner; result area shows skeleton cards
- Results tabs only render for selected outputs
- Each tab has an independent **Copy** button
- Tabs appear as each Claude call completes (not all at once)
- After results appear, a delivery section shows below with two options:
  - **Email:** user enters their address and hits Send — all selected outputs arrive as a single formatted email via Resend
  - **Download:** one click downloads all selected outputs as a `.zip` containing individual `.md` / `.txt` files
- Send button shows a spinner while email is in flight; shows a success checkmark on delivery
- Default theme: clean & minimal (white bg, slate text, subtle borders)
- Dark mode: full support via next-themes

---

## Claude Prompt Design

One Claude call per selected output. Each uses a distinct persona and format constraint:

| Output | Prompt persona & instruction |
|---|---|
| README | *"You are a technical writer. Based on this code, write a clean README with: a one-line description, what it does, how to install it, and how to use it. Use markdown."* |
| Landing page | *"You are a SaaS copywriter. Write: a hero headline (under 10 words), a subheadline (one sentence), three feature bullets, and a CTA button label. Plain text, no markdown headers."* |
| Tweet thread | *"You are a developer advocate. Write a 5-tweet launch thread. Tweet 1 hooks, tweets 2-4 explain key features, tweet 5 is the CTA with a link placeholder. Number each tweet."* |
| Product Hunt | *"You are a Product Hunt veteran. Write: a tagline (under 60 chars), a description (under 260 chars), and a first comment that tells the maker's story. Label each section."* |

**Why separate calls:** Each output needs a different voice and format constraint. A single call producing all four generates mediocre results. Separate focused prompts produce noticeably better output.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Empty input | Generate button disabled — no error shown |
| No outputs selected | Generate button disabled |
| Invalid GitHub URL | Inline error under input field |
| Private GitHub repo | Inline message: *"This repo is private — paste the code directly instead."* |
| Repo too large | Fetch only key files (capped at ~15k tokens); note in UI what was sampled |
| Claude API error | Toast at top of page: *"Something went wrong. Try again."* |
| Network error | Same toast pattern |
| Invalid email address | Inline error under email field: *"Please enter a valid email address."* |
| Email send failure | Toast: *"Couldn't send the email. Try downloading instead."* |
| Email send success | Inline checkmark + *"Sent! Check your inbox."* |

---

## Out of Scope (v1)

- User accounts / saved history
- Private repo support via OAuth
- PDF / file upload as input
- Custom prompt editing
- Demo video script output (can add in v2)
- Per-tab individual file download (Download All covers this in v1)

---

## Success Criteria

- A developer can paste a GitHub URL and get all four outputs in under 30 seconds
- Copy buttons work reliably across browsers
- Email delivery works end-to-end (Resend → inbox)
- Download produces a valid .zip with correctly named files
- App is deployed and publicly accessible on Vercel
- Light and dark mode both look polished
- Works on mobile (responsive layout)
