# TGL Rules Voting

Private rules voting platform for **The Greatest League** — a 12-member fantasy football league.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** (PostgreSQL database)
- **bcryptjs** (PIN hashing)
- **jose** (JWT session management)
- **Vercel** (deployment target)

## Features

- Fixed 12-member roster — no public registration
- PIN-based authentication with server-side hashing
- Proposal lifecycle: Draft → Open → Closed
- One vote per member per proposal (immutable)
- Live vote counts hidden until outcome is determined
- Vote breakdown only visible after a proposal passes or fails
- Commissioner panel for managing proposals, members, and privileges
- Full audit logging

## Voting Rules

- A proposal **passes** when it receives **7+ YES** votes
- A proposal **fails** when it receives **6+ NO** votes (can no longer reach 7 YES)
- Otherwise the proposal remains **pending**

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_SECRET=a-random-string-at-least-32-chars
```

### 3. Set up Supabase

1. Create a new Supabase project
2. Go to the SQL Editor
3. Run the migration file: `supabase/migrations/20240101000000_initial_schema.sql`
4. Run the seed file: `supabase/seed.sql`

### 4. Place the logo

Put your league logo at:

```
public/images/tgl_logo.png
```

A placeholder is included. Replace it with the real logo.

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in Vercel
3. Set environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
4. Deploy

## Commissioner Privileges

Marcus is seeded as the first commissioner. Commissioners can:

- Create, edit, open, and close proposals
- View voting records (even while proposal is open)
- Reset member PINs
- Update member/team names
- Grant or remove commissioner privileges

All commissioner checks are enforced server-side.

## Resetting PINs

Commissioners can reset any member's PIN from the Commissioner Panel → Members tab → Reset PIN. The member will be prompted to create a new PIN on their next login.

## Database Schema

- `members` — 12 league members
- `proposals` — rule change proposals
- `votes` — immutable vote records
- `audit_log` — action history
- `league_settings` — league configuration
