# WorkTime — Premium Work Tracker & Analytics

WorkTime is a premium, responsive time tracking and productivity analytics dashboard built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, and **Prisma ORM 7 with PostgreSQL**. It is designed to help professionals track their active working blocks, view detailed daily analytics, and manage historical task logs.

🔗 **Live:** [https://time.tajirsystems.com](https://time.tajirsystems.com)

---

## 🌟 Key Features

### ⏱️ Real-time Time Tracker
- **Clock In / Out Controls**: Easily start, pause, resume, and stop active tasks.
- **Micro-responsive UI**: Fluidly stacks vertically on small mobile viewports (down to 320px) and reverts to a sleek side-by-side layout on desktop screens.

### 📊 Rich Visual Analytics
- **Last 7 Days Activity**: An interactive SVG bar chart displaying total hours worked per day with hover tooltips and dynamic scaling.
- **Horizontal Scroll on Mobile**: The chart is wrapped in a smooth scrollable container to maintain text legibility on narrow devices.
- **Time Investment Breakdown**: A progress-indicator list displaying the top 5 tasks and their percentage contribution to overall logged hours.

### 📈 Metrics & Stats Panel
- **Hours Today & Daily Goal**: Summarizes today's active time with a dynamic progress bar relative to an 8-hour goal.
- **Hours This Week & Month**: Automatically aggregates working hours from Monday–Sunday and for the current calendar month.

### 📋 Interactive Log History
- **Desktop Table & Mobile Cards**: Automatically switches between a dense information table (desktop) and detailed card lists (mobile).
- **Search & Filter**: Find specific blocks via search strings or filter by task descriptions.
- **In-line Editing**: Update task descriptions directly from the logs with validated input fields.
- **Data Export**: Export historical data logs as clean **CSV** or **JSON** files.

### 🔐 Secure Authentication & Route Protection
- **JWT Access Tokens** (15-minute expiry) + **Refresh Token Rotation** (7-day, stored in `HttpOnly` cookie).
- **reCAPTCHA v3** on login and register forms to block automated abuse.
- **Brute-force Protection**: Progressive tarpitting delay + IP/email lockout via database-tracked `AuthFailure` records.
- **Registration Rate Limiting**: Max 3 new accounts per IP per hour (enforced via `RegistrationLimit` table).
- **Global Rate Limiting**: Upstash Redis sliding-window rate limiter — 30 req/60s on auth routes, 120 req/60s elsewhere — applied in `proxy.ts`.
- **CORS**: Restricted to `CLIENT_URL` + localhost in development; handled by `proxy.ts`.
- **Security Headers**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS` (production only).
- **Theme Transitions**: Seamless Light/Dark mode using GPU-accelerated View Transitions API.

### 🛡️ Spoofing Attack Protections
- **IP Spoofing (XFF)**: `lib/get-client-ip.ts` implements trusted-proxy-aware IP extraction. Controlled by `TRUSTED_PROXY_COUNT`, it takes the rightmost non-proxy IP from `X-Forwarded-For` instead of blindly trusting the attacker-controlled leftmost value — preventing rate-limit bypass via header injection.
- **JWT Algorithm Confusion**: `verifyJwt` pins `algorithms: ["HS256"]`, explicitly rejecting `alg:"none"` unsigned tokens and RS256 algorithm-switch attacks.
- **JWT Issuer/Audience Validation**: All tokens carry `iss` and `aud` claims set to `"worktime-tracker"`. Tokens from other services (even sharing the same secret) are rejected on verification.
- **CSRF Origin Spoofing**: `lib/csrf.ts` validates the `Origin` header on all state-changing cookie endpoints (`/refresh`, `/logout`). Requests from foreign origins are rejected with `403` before any cookie or token logic runs.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Frontend** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Database ORM** | [Prisma 7](https://www.prisma.io/) with `@prisma/adapter-pg` |
| **Database** | [PostgreSQL](https://www.postgresql.org/) (Neon serverless recommended) |
| **Auth** | [jose](https://github.com/panva/jose) (JWT HS256) + bcryptjs |
| **Validation** | [Zod v4](https://zod.dev/) |
| **Rate Limiting** | [Upstash Redis](https://upstash.com/) + `@upstash/ratelimit` |
| **CAPTCHA** | Google reCAPTCHA v3 |
| **Language** | TypeScript 5 |

---

## 🗄️ Database Schema

Five Prisma models stored in PostgreSQL:

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Account credentials & profile |
| `TimeLog` | `time_logs` | Individual tracked work sessions |
| `RefreshToken` | `refresh_tokens` | Rotating refresh token store |
| `RegistrationLimit` | `registration_limits` | IP-based signup rate limiting |
| `AuthFailure` | `auth_failures` | Brute-force attempt tracking |

> **Note:** Prisma 7 reads the `DATABASE_URL` from `prisma.config.ts`, not `schema.prisma`.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18.x or later
- A **PostgreSQL** database (local or [Neon](https://neon.tech) free tier)
- An **Upstash Redis** database ([free tier](https://console.upstash.com))
- A **Google reCAPTCHA v3** site key ([admin console](https://www.google.com/recaptcha/admin))

### 2. Installation
```bash
git clone https://github.com/Mohammedmt10/time-tracker.git
cd tracker-of-working
npm install
```

### 3. Environment Setup
Copy the example file and fill in your values:
```bash
cp .env.example .env.local
```

```env
# Neon / PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# JWT signing secret — min 32 characters, generated randomly
JWT_SECRET="replace-with-a-long-random-secret-min-32-chars"

# Client URL for CORS (your production domain or localhost)
CLIENT_URL="http://localhost:3000"

# Google reCAPTCHA v3 credentials
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="your-recaptcha-site-key"
RECAPTCHA_SECRET_KEY="your-recaptcha-secret-key"

# Upstash Redis — from console.upstash.com
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Trusted Proxy Count (IP Spoofing protection)
# 0 = direct connections, 1 = behind one reverse proxy/CDN (Vercel, Nginx)
TRUSTED_PROXY_COUNT=1
```

> **reCAPTCHA domain:** Register your production domain (e.g. `time.tajirsystems.com`) in the [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin) or you will see "Invalid domain for site key" errors.

### 4. Database Initialization
Run Prisma migrations to create all tables:
```bash
npx prisma migrate dev
```

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔧 Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server with Turbopack HMR |
| `npm run build` | Optimized production build |
| `npm run start` | Run the production server |
| `npm run lint` | ESLint checks |

---

## 🏗️ Project Structure

```
tracker-of-working/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/        # POST — authenticate user + reCAPTCHA verify
│   │   │   ├── register/     # POST — create account + reCAPTCHA verify
│   │   │   ├── refresh/      # POST — refresh token rotation
│   │   │   ├── logout/       # POST — revoke refresh token
│   │   │   └── me/           # GET  — current user profile
│   │   └── logs/
│   │       ├── route.ts      # GET (list) / POST (create) time logs
│   │       └── [id]/         # PUT (update) / DELETE time log by id
│   ├── login/                # Sign-in page
│   ├── register/             # Sign-up page
│   ├── layout.tsx            # Root layout with AuthProvider
│   └── page.tsx              # Main dashboard (protected)
├── components/               # UI components (TimeTracker, StatsPanel, etc.)
├── context/
│   └── AuthContext.tsx       # JWT state, login/register/logout, authFetch
├── lib/
│   ├── auth.ts               # signJwt / verifyJwt (HS256 pinned, iss+aud claims)
│   ├── auth-limiter.ts       # Brute-force lockout + tarpitting (DB-backed)
│   ├── csrf.ts               # CSRF Origin header validator (refresh, logout)
│   ├── get-client-ip.ts      # Trusted-proxy-aware IP extraction (XFF spoofing fix)
│   ├── middleware-auth.ts    # requireAuth() helper for API routes
│   ├── prisma.ts             # Prisma client singleton
│   ├── recaptcha.ts          # verifyRecaptcha() server-side helper
│   └── upstash-limiter.ts   # Redis sliding-window rate limiter (fail-open)
├── prisma/
│   └── schema.prisma         # Database models
├── scripts/
│   └── test-spoofing.mjs     # Automated spoofing protection test suite
├── proxy.ts                  # CORS + rate limiting + security headers proxy
├── prisma.config.ts          # Prisma 7 datasource config (reads DATABASE_URL)
└── .env.local                # Local secrets (gitignored)
```

---

## 🚢 Deployment (Vercel)

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Add all environment variables from `.env.example` under **Project Settings → Environment Variables**.
4. Set `CLIENT_URL` to your production domain (e.g. `https://time.tajirsystems.com`).
5. Deploy. Prisma client is auto-generated via the `postinstall` script.

---

## 📱 Mobile Responsiveness

The layout is tailored for viewports down to **320px (Mobile S)**:

1. **Custom Breakpoints**: A custom Tailwind breakpoint (`xs: 480px`) for smooth adaptations between small phones and tablets.
2. **Tappable Controls**: Time Tracker controls stack vertically on mobile for easy touch interaction.
3. **SVG Scrolling**: Analytics Chart uses `overflow-x-auto` to prevent text compression on narrow screens.
4. **Form Optimization**: Auth card paddings scale down on mobile to maximize usable width.
5. **Card/Table Switching**: Log History renders as collapsible cards on mobile and a dense table on desktop.


