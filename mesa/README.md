# Chowli — Local Food Marketplace
> A Progressive Web App connecting restaurants and customers in one place.

---

## Stage 1 Setup — Supabase + Vercel

### Step 1 — Create a Supabase project
1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project** → name it `mesa` → choose a strong database password
3. Wait for the project to spin up (~1 min)

### Step 2 — Run the database schema
1. In Supabase: go to **SQL Editor** → **New Query**
2. Paste the contents of `supabase/schema.sql` and click **Run**
3. Paste the contents of `supabase/seed.sql` and click **Run**
   - Note: seed data uses placeholder owner IDs. After creating a real account
     in the app, update the `owner_id` values in the restaurants table.

### Step 3 — Get your API keys
1. In Supabase: go to **Project Settings** → **API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Step 4 — Enable Email Auth
1. In Supabase: go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. For production, disable **Confirm email** initially so testing is easier
   (re-enable it before going live)

### Step 5 — Enable Realtime
1. In Supabase: go to **Database** → **Replication**
2. Enable replication for: `restaurants`, `posts`, `likes`

### Step 6 — Local development
```bash
# Clone the repo
git clone https://github.com/yourname/mesa.git
cd mesa

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and fill in your Supabase URL and anon key

# Start dev server
npm run dev
# → Opens at http://localhost:5173
```

### Step 7 — Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# Project → Settings → Environment Variables
# Add: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

Or connect your GitHub repo to Vercel for automatic deploys on every push.

### Step 8 — Install as PWA on your phone
**Android (Chrome):**
1. Open your Vercel URL in Chrome
2. Tap the menu (⋮) → "Add to Home screen"
3. Done — it installs like a native app

**iOS (Safari):**
1. Open your Vercel URL in Safari
2. Tap the Share button (⬆) → "Add to Home Screen"
3. Done

---

## Project Structure
```
mesa/
├── src/
│   ├── lib/
│   │   └── supabase.js          # Supabase client singleton
│   ├── hooks/
│   │   ├── useAuth.js           # Auth state, sign in/up/out
│   │   ├── useRestaurants.js    # Restaurant data + realtime
│   │   └── useFeed.js           # Posts feed + likes + realtime
│   ├── App.jsx                  # Main app (all screens)
│   └── main.jsx                 # Entry point
├── supabase/
│   ├── schema.sql               # All tables, RLS policies, triggers
│   └── seed.sql                 # Sample restaurant data
├── index.html                   # PWA meta tags (iOS + Android)
├── vite.config.js               # Vite + PWA plugin config
├── vercel.json                  # Vercel deployment config
├── .env.example                 # Environment variable template
└── package.json
```

## Making a user a restaurant owner
After a restaurant owner creates an account:
1. Go to Supabase → **Table Editor** → `profiles`
2. Find the user's row
3. Change `role` from `customer` to `owner`
4. Update their restaurant row's `owner_id` to their user UUID

---

## Stage 2 (coming next)
- Node.js/Express backend on Railway
- Firebase FCM push notifications
- Image uploads (restaurant logos, food photos)
- Termii SMS/OTP for phone login
- Analytics dashboard
