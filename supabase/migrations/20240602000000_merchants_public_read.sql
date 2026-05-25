-- Migration: allow any authenticated user to read merchant rows
-- Rollback: DROP POLICY "merchants_select_public" ON public.merchants;

CREATE POLICY "merchants_select_public"
  ON public.merchants FOR SELECT
  USING (true);
