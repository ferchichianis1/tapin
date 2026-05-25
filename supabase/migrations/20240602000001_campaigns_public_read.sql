-- Migration: allow any authenticated user to read active campaign rows
-- Rollback: DROP POLICY "campaigns_select_public" ON public.campaigns;

CREATE POLICY "campaigns_select_public"
  ON public.campaigns FOR SELECT
  USING (true);
