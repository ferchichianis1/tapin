# TapIn — Claude Code Context

## What is TapIn?
TapIn is a customer retention platform for local merchants. Customers tap an NFC stand or scan a QR code at a coffee shop, earn points, and unlock rewards. No payments, no banking, no crypto.

## Monorepo Layout
```
/apps/customer     — Customer-facing PWA (Next.js 14)
/apps/merchant     — Merchant dashboard (Next.js 14)
/supabase          — Database migrations and seed data
/.claude           — Agent and skill definitions
```

## Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Database / Auth**: Supabase (PostgreSQL + Row Level Security)
- **Hosting**: Vercel (both apps as separate projects)
- **NFC / QR**: Web NFC API (customer PWA) + `qrcode` npm package (merchant dashboard)

## Key Rules
1. **No payments, no banking, no crypto** — if a feature touches money or wallets, reject it.
2. **App Router only** — never use `/pages` directory in new code.
3. **Server Components by default** — add `"use client"` only when the component needs browser APIs or local state.
4. **Supabase RLS** — every table must have Row Level Security enabled with explicit policies. No `service_role` key in client-side code.
5. **TypeScript strict mode** — no `any`, no `@ts-ignore` without a comment explaining why.
6. **Tailwind only** — no CSS modules, no styled-components, no inline `style` props except for dynamic values unavailable in Tailwind.
7. **Environment variables** — prefix with `NEXT_PUBLIC_` only when the value is safe to expose to the browser. Never expose `SUPABASE_SERVICE_ROLE_KEY` publicly.
8. **Migrations are append-only** — never edit an existing migration file; always create a new one.

## Database Conventions
- Table names: plural snake_case (`merchants`, `nfc_codes`)
- Primary keys: `id uuid DEFAULT gen_random_uuid()`
- Timestamps: `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`
- Foreign keys: `<table_singular>_id` (e.g., `merchant_id`, `customer_id`)

## Agent Roles
| Agent | File | Responsibility |
|---|---|---|
| Backend | `.claude/agents/backend.md` | API routes, Supabase queries, migrations |
| Frontend | `.claude/agents/frontend.md` | React components, Tailwind UI, PWA features |
| QA | `.claude/agents/qa.md` | Test plans, edge cases, regression checks |
| Deploy | `.claude/agents/deploy.md` | Vercel config, env vars, CI/CD |

## Skills
| Skill | File | When to use |
|---|---|---|
| Tap flow | `.claude/skills/tap-flow.md` | Adding or changing the NFC/QR → points flow |
| Supabase migration | `.claude/skills/supabase-migration.md` | Writing a new migration file |
| Next.js API route | `.claude/skills/nextjs-api-route.md` | Creating a new `/api` endpoint |
| Tailwind component | `.claude/skills/tailwind-component.md` | Building a new UI component |
