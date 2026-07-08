# WorkTime — Premium Work Tracker & Analytics

WorkTime is a premium, responsive time tracking and productivity analytics dashboard built with **Next.js 16 (App Router)**, **Tailwind CSS**, and **Prisma ORM with PostgreSQL**. It is designed to help professionals track their active working blocks, view detailed daily analytics, and manage historical task logs.

---

## 🌟 Key Features

### ⏱️ Real-time Time Tracker
- **Clock In / Out Controls**: Easily start, pause, resume, and stop active tasks.
- **Micro-responsive UI**: Fluidly stacks vertically on small mobile viewports (down to 320px) to provide large, tap-friendly buttons, and reverts to a sleek side-by-side layout on desktop screens.

### 📊 Rich Visual Analytics
- **Last 7 Days Activity**: An interactive SVG bar chart displaying total hours worked per day. Features smooth hover states, dynamic scaling (to at least 8 hours), and interactive tooltips.
- **Horizontal Scroll on Mobile**: The chart is wrapped in a smooth scrollable container to maintain text legibility and click-target sizes on narrow mobile devices.
- **Time Investment Breakdown**: A progress-indicator list displaying the top 5 tasks and their percentage contribution to your overall logged hours.

### 📈 Metrics & Stats Panel
- **Hours Today & Daily Goal**: Summarizes today's active time with a dynamic progress bar relative to an 8-hour goal.
- **Hours This Week & Month**: Automatically aggregates your working hours from Monday to Sunday and lists the total hours for the current calendar month.
- **Adaptive Text Layout**: Adjusts stats subtexts to fit the card boundaries cleanly across mobile, tablet, and desktop viewports.

### 📋 Interactive Log History
- **Desktop Table & Mobile Cards**: Automatically switches between a dense information table (desktop) and detailed collapsible card lists (mobile).
- **Search & Filter**: Find specific blocks via search strings or filter by task descriptions with a dropdown menu.
- **In-line Editing**: Update task descriptions directly from the logs with validated input fields.
- **Data Export**: Export your historical data logs as clean **CSV** or **JSON** files.

### 🔐 Secure Authentication & Route Protection
- **JWT Sessions**: Session verification handled securely via React Context (`AuthContext.tsx`) and Middleware.
- **Secure Auth Cards**: Stunning Login and Sign Up interfaces with responsive form padding to maximize space on narrow viewports.
- **Theme Transitions**: Seamless transitions between Light and Dark mode using custom GPU-accelerated view transitions.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (Turbopack / App Router)](https://nextjs.org/)
- **Frontend & Styling**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database ORM**: [Prisma ORM](https://www.prisma.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or later)
- A running **PostgreSQL** database instance

### 2. Installation
Clone the repository, navigate to the project directory, and install the dependencies:
```bash
git clone https://github.com/Mohammedmt10/time-tracker.git
cd tracker-of-working
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and add your connection string and authentication secrets:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/time_tracker_db?schema=public"
JWT_SECRET="your-super-secure-jwt-secret-key"
```

### 4. Database Initialization
Run the Prisma migrations to create the database schemas:
```bash
npx prisma migrate dev
```

### 5. Running the Application
Start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🔧 Scripts Available

Inside the project directory, you can run:

- **`npm run dev`**: Starts the development server with Hot Module Replacement (HMR) and Turbopack.
- **`npm run build`**: Compiles the project and generates an optimized production build.
- **`npm run start`**: Runs the compiled Next.js production server.
- **`npm run lint`**: Performs syntax checks using ESLint configuration guidelines.

---

## 📱 Mobile Responsiveness Highlights

We have tailored the layout using modern CSS practices to ensure visual excellence on viewports down to **320px (Mobile S)**:
1. **Custom Breakpoints**: Added a custom Tailwind breakpoint (`xs: 480px`) inside `globals.css` to allow smooth responsive adaptations between small phones and standard tablets.
2. **Horizontal Card Badges**: Refactored raw text panels in the Hero Banner into styled badges with icons and background shades.
3. **Tappable Controls**: Stacked control inputs vertically in the Time Tracker component on mobile for ease of touch interaction.
4. **SVG Scrolling**: Added `overflow-x-auto` to the Analytics Chart SVG, preventing text compression.
5. **Form Optimization**: Scaled auth card form paddings down to `p-6` on mobile screens to maximize usable width.
