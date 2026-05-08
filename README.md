# ParkitJiran

A free, mobile-friendly web app for condo residents to share parking bays with their neighbours — without a middleman.

Built voluntarily by a resident. Not affiliated with or endorsed by building management.

## What it does

- Residents post a parking request with a start and end time
- Neighbours who can help offer their bay and contact the requester directly via WhatsApp
- Requests auto-close once fulfilled, cancelled, or expired
- Real-time list updates via Supabase Realtime + 15-second polling fallback

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla JS (ES modules), Tailwind CSS (CDN), single-page `index.html` |
| Backend | Supabase (Postgres + Auth + Row Level Security) |
| Edge Functions | Deno (Supabase Edge Functions) |
| PWA | Service worker + Web App Manifest |
| Tests | Vitest |

## Edge Functions

| Function | Purpose |
|---|---|
| `complete-signup` | Create a resident account (no email OTP) |
| `verify-resident` | Verify phone + unit + bay on login |
| `update-profile` | Update name, email, or bay number |
| `delete-account` | Cancel open requests and permanently delete account |
| `send-feedback` | Forward feedback emails with reply-to support |
| `notify-push` | Send push notifications on fulfil/cancel events |

## Authentication model

Login is credential-based: phone number + unit number + parking bay. No passwords. No SMS OTP. Identity is verified server-side against the residents table, then a Supabase Auth session is issued.

## Privacy & data

- Personal details (name, unit) are **never** shown on the public request list
- Phone number is shared only when a neighbour agrees to help (via WhatsApp link)
- Data is protected by Postgres Row Level Security — users can only read/modify their own records
- Compliant with Malaysia's PDPA 2010; account deletion removes all personal data

## Running locally

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key
3. Apply migrations: `supabase db push`
4. Deploy Edge Functions: `supabase functions deploy`
5. Serve `index.html` from any static file server (e.g. `npx serve .`)

## Tests

```bash
npm test
```

## Project structure

```
index.html          # Single-page app
src/
  auth.js           # Supabase auth helpers
  db.js             # Database query helpers
  lib.js            # Formatting, validation, sanitisation utilities
  pwa.js            # PWA install prompt logic
supabase/
  functions/        # Edge Functions (Deno)
  migrations/       # Postgres migrations
sw.js               # Service worker
manifest.json       # PWA manifest
```

## Licence

MIT — free to fork and adapt for your own condo community.
