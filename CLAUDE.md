# CLAUDE.md — Design Waterloo Codebase Guide

This file provides context for AI assistants working in this repository.

---

## Project Overview

Design Waterloo is a directory platform for design students at the University of Waterloo and Wilfrid Laurier University. Users sign in with their university email, complete an onboarding profile, and are reviewed before appearing in the public directory.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + CSS Modules |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| CMS | Sanity CMS (image assets, secondary content) |
| Deployment | Vercel |
| Runtime | Node.js 20 |

**Key libraries:** `@supabase/ssr`, `@supabase/supabase-js`, `next-sanity`, `@sanity/image-url`, `lenis` (smooth scroll), `next-view-transitions`, `@vercel/analytics`

---

## Development Commands

```bash
npm run dev      # Start dev server with Turbopack (localhost:3000)
npm run build    # Production build with Turbopack
npm start        # Start production server
npm run lint     # Run ESLint
```

No test framework is currently configured.

---

## Environment Variables

Create a `.env.local` file at the project root:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://skalyworwmxcofolgnjs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>

# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID=<project id>
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=<write token — server-side only>
```

`NEXT_PUBLIC_` variables are exposed to the browser. Never expose `SANITY_API_TOKEN` client-side.

---

## Directory Structure

```
src/
  app/                  # Next.js App Router — pages and API routes
    layout.tsx          # Root layout: wraps with AuthProvider, Analytics, Transitions
    page.tsx            # Homepage — fetches featured members from Supabase
    sign-in/            # Sign-in page (OAuth + OTP)
    auth/
      callback/         # OAuth callback handler
      sign-out/         # Sign-out handler
    directory/
      page.tsx          # Directory listing (server component, ISR 30s)
      DirectoryClient.tsx  # Client-side filtering/search
      [slug]/page.tsx   # Individual member profile
    profile/edit/       # Profile editing / onboarding flow
    admin/              # Admin review panel (requires is_admin)
    dashboard/          # Authenticated user dashboard
    pending-approval/   # Shown while awaiting review
    api/
      upload-image/     # Uploads image to Sanity, updates member record
      revalidate-profile/ # Triggers ISR revalidation after profile update
  components/           # Reusable React components
  context/              # React context providers
  lib/                  # Utilities and helpers
    supabase/
      server.ts         # Server-side Supabase client
      client.ts         # Browser-side Supabase client
      rest.ts           # REST API helper with 8s timeout
      auth-utils.ts     # Email validation, school detection, slug generation
    haptics.ts
    specialties.ts      # 17 design specialties with URL codes
    termUtils.ts
    urlUtils.ts
  sanity/               # Sanity CMS integration
    lib/client.ts
    lib/image.ts        # Image URL builder (WebP output)
    types.ts
  types/
    database.ts         # Supabase schema TypeScript interfaces
  data/
    programs.ts         # 150+ university programs per school
middleware.ts           # Route protection and auth redirects
```

---

## Authentication & Authorization

### Allowed Email Domains
- `@uwaterloo.ca` — Azure/Microsoft OAuth
- `@mylaurier.ca` — Email OTP

Other domains are rejected at the sign-in step.

### Member Review States
Members progress through: `draft` → `pending_review` → `approved` / `rejected`

- Auth callback automatically creates a `draft` member row
- After onboarding, status becomes `pending_review`
- Admin approves/rejects from `/admin`
- Only `approved` members appear in the public directory

### Middleware-Protected Routes
- `/onboarding`, `/profile`, `/dashboard`, `/pending-approval` — require authenticated session
- `/admin` — requires `is_admin = true`
- `/sign-in` — redirects away if already authenticated

---

## Database Schema (Supabase)

### `members`
Primary user profiles. Key fields:
- `id`, `user_id` (auth foreign key), `slug` (unique URL identifier)
- `first_name`, `last_name`, `email`, `school`, `program`, `grad_year`
- `bio`, `avatar_url`, `portfolio_url`, `linkedin_url`, `github_url`
- `specialties` (array), `work_schedule` (array)
- `review_status` — `draft | pending_review | approved | rejected`
- `onboarding_completed` (bool), `is_approved` (bool), `is_admin` (bool)
- `created_at`, `updated_at`

### `member_experiences`
Work history linked to `members`.

### `member_leadership`
Leadership positions linked to `members`.

---

## Specialties System

17 design specialties with short URL codes (`/src/lib/specialties.ts`). Examples:

| Code | Specialty |
|---|---|
| `PRD` | Product Design |
| `UXR` | UX Research |
| `GFX` | Graphic Design |
| `MOT` | Motion Design |

Codes are used as URL query parameters for filtering the directory.

---

## Component Conventions

- **Client vs Server:** Use `"use client"` only when component needs browser APIs, state, or effects. Prefer server components for data fetching.
- **Styling:** CSS Modules (`.module.css`) for complex component styles; Tailwind utilities for simple one-off styles. Do not mix approaches arbitrarily.
- **Links:** Use the custom `<Link>` component from `src/components/Link/` (wraps `next/link` with page transitions) instead of importing directly from `next/link`.
- **Supabase client:** Use `src/lib/supabase/server.ts` in server components/routes; use `src/lib/supabase/client.ts` in client components.
- **Images:** Use the Sanity image builder from `src/sanity/lib/image.ts` for Sanity-hosted images; configure new remote domains in `next.config.ts`.

---

## Naming Conventions

- `camelCase` — variables and functions
- `PascalCase` — React components and TypeScript types/interfaces
- `kebab-case` — file and folder names (except `.module.css` and index files)
- `UPPER_SNAKE_CASE` — environment variable names

---

## Data Flow Patterns

1. **Directory page:** Server component fetches `approved` members from Supabase → passes to `DirectoryClient` for client-side filtering/search.
2. **Profile update:** Client calls `/api/upload-image` → image stored on Sanity CDN → member `avatar_url` updated in Supabase → `/api/revalidate-profile` triggers ISR.
3. **Slug generation:** `auth-utils.ts` generates URL-safe slugs from names; appends numeric suffix if duplicate (e.g., `jane-doe-2`).

---

## Sanity CMS

Sanity is used primarily for image asset hosting. The Sanity client is configured in `src/sanity/lib/client.ts`. Sanity types use `_ref`, `_id`, `_type` underscore-prefixed keys — do not rename these.

---

## Key Constraints

- Do not add tests without first discussing the testing strategy (no framework is configured).
- The directory has ISR with a 30-second revalidation window — changes to member data appear with up to 30s delay.
- Slug uniqueness is enforced in `auth-utils.ts`, not at the database level — always use the utility for slug generation.
- `legacy-peer-deps=true` is set in `.npmrc` — do not remove it or dependency installation will break.
- Email validation is the gating mechanism for onboarding — changes to allowed domains affect who can register.

---

## MCP Configuration

`.mcp.json` configures a Supabase MCP server. This is used by AI tools (like Claude) to query the database directly during development sessions.
