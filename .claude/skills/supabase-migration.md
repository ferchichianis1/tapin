# Skill: Supabase Migration

## When to Use
Use this skill every time you need to change the database schema: adding a table, adding a column, creating an index, writing an RPC function, or updating an RLS policy.

## Rules
1. **Never edit an existing migration file** — always create a new numbered file.
2. **File naming**: `YYYYMMDDHHMMSS_short_description.sql` (e.g., `20240601120000_add_points_expiry.sql`)
3. **Every new table must have RLS enabled** and at least one policy before the migration ends.
4. **Use `IF NOT EXISTS` / `IF EXISTS`** guards so migrations are idempotent on re-run.
5. **Include a rollback comment** at the top describing how to undo the migration if needed.

## Template
```sql
-- Migration: <short description>
-- Rollback: DROP TABLE <name>; / ALTER TABLE ... DROP COLUMN ...;

-- ============================================================
-- TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.<table_name> (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... columns ...
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_<table>_<col> ON public.<table_name>(<col>);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table_name>_select_own"
  ON public.<table_name> FOR SELECT
  USING (auth.uid() = user_id);  -- adjust to actual ownership column
```

## Running Migrations
```bash
# Local development
supabase db reset          # applies all migrations from scratch
supabase migration new <name>   # creates new timestamped file

# Production
supabase db push           # applies pending migrations
supabase db push --dry-run # preview without applying
```
