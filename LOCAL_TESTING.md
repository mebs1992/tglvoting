# Local Testing Guide

Step-by-step guide to test the TGL Rules Voting app locally.

## Prerequisites

- Node.js 18+
- A Supabase project (free tier works)

## Steps

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials and a session secret (any random string, 32+ chars).

### 3. Run Supabase SQL migration

In the Supabase SQL Editor, run the contents of:

```
supabase/migrations/20240101000000_initial_schema.sql
```

### 4. Run seed data

In the Supabase SQL Editor, run the contents of:

```
supabase/seed.sql
```

This creates 12 members (Marcus as commissioner) and one sample proposal.

### 5. Start local dev server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 6. Login as Marcus

1. Select "Marcus" from the member dropdown
2. You'll see the "Create PIN" flow (first login)
3. Enter a 4-8 digit PIN and confirm it
4. Click "Create PIN & Continue"
5. You should be redirected to the Dashboard

### 7. Confirm Marcus can access Commissioner Panel

1. You should see a gold "Commissioner" link in the header
2. Click it to open the Commissioner Panel
3. Verify you see the Proposals and Members tabs

### 8. Create and open a proposal

1. In the Commissioner Panel, click "+ Create Proposal"
2. Enter a title and description
3. Click "Create"
4. Find the new proposal in the list (status: draft)
5. Click "Open" to make it available for voting

### 9. Login as another member

1. Click "Logout"
2. Select "Member 2" from the dropdown
3. Create a PIN for Member 2
4. You should be on the Dashboard with open proposals visible

### 10. Vote once

1. Click on an open proposal
2. Click YES or NO
3. Confirm the vote is submitted and the buttons are replaced with "Vote Submitted"

### 11. Confirm duplicate voting is blocked

1. Refresh the page
2. The proposal should still show "Vote Submitted"
3. No voting buttons should appear for that proposal

### 12. Confirm pending results are hidden

1. Go to the Results page
2. The proposal should appear under "Awaiting Outcome"
3. No vote counts or voter names should be visible

### 13. Confirm finalised results are visible

1. Log back in as Marcus
2. Open the Commissioner Panel
3. Use the vote as different members until a proposal reaches 7 YES or 6 NO
4. Go to Results — the finalised proposal should show YES/NO/Not Voted counts

### 14. Confirm vote breakdown is visible only after outcome

1. On the Results page, click "Vote Breakdown" on a finalised proposal
2. You should see YES voters, NO voters, and Not Voted members
3. Try accessing a pending proposal's breakdown URL directly — you should see "Results are hidden until this vote reaches an outcome."

## Smoke Test Checklist

- [ ] Login flow works (select member → create PIN → dashboard)
- [ ] Returning login works (select member → enter PIN → dashboard)
- [ ] Open proposals appear on dashboard
- [ ] Voting works (YES/NO)
- [ ] Duplicate votes are blocked
- [ ] Vote counts are hidden while pending
- [ ] Results show after proposal reaches outcome
- [ ] Vote breakdown shows voter names after outcome
- [ ] Commissioner panel is accessible only to commissioners
- [ ] Create/edit/open/close proposals work
- [ ] Reset PIN works
- [ ] Update member names works
- [ ] Grant/remove commissioner works
- [ ] Logout works
