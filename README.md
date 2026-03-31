# Design at Waterloo

The website for Design at Waterloo, built with Next.js, Sanity CMS, and Supabase.

## Prerequisites

You'll need these installed on your computer before you start:

1. **Node.js** (v18 or newer) — download from [nodejs.org](https://nodejs.org/) and run the installer
2. **npm** — comes bundled with Node.js, no extra install needed
3. **Git** — download from [git-scm.com](https://git-scm.com/) if you don't have it

To check if you already have them, open your terminal and run:

```bash
node -v
npm -v
git --version
```

If each prints a version number, you're good to go.

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/designatwaterloo/designwaterloo.git
cd designwaterloo
```

### 2. Install dependencies

```bash
npm install
```

This will download everything the project needs. It may take a minute the first time.

### 3. Set up environment variables

The project needs API keys for Sanity (CMS) and Supabase (auth/database). These are **not** stored in the repo for security reasons.

Create a file called `.env.local` in the project root:

```bash
# Sanity (content management)
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
SANITY_API_TOKEN=

# Supabase (auth & database)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Ask a team member for the values to fill in. Paste them after each `=` with no spaces.

### 4. Run the dev server

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser. The page will automatically reload when you save changes to the code.

### 5. Stop the dev server

Press `Ctrl + C` in the terminal.

## Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the production version (used by deployment) |
| `npm run start` | Run the production build locally |
| `npm run lint` | Check for code style issues |

## Project structure

```
src/
├── app/          # Pages and routes
├── components/   # Reusable UI components
├── lib/          # Shared utilities (Supabase client, Sanity client, etc.)
└── styles/       # Global styles
```

## Deployment

The site deploys automatically via Vercel when changes are pushed to the `main` branch. You don't need to do anything manually — just merge your PR and it goes live.
