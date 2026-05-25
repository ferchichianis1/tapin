-- Migration: public read policies for nfc_codes, visits, reward_claims
-- Rollback:
--   DROP POLICY "nfc_codes_select_public" ON public.nfc_codes;
--   DROP POLICY "visits_select_public" ON public.visits;
--   DROP POLICY "reward_claims_select_public" ON public.reward_claims;

-- nfc_codes: any authenticated user can read active codes (needed to resolve a tap)
CREATE POLICY "nfc_codes_select_public"
  ON public.nfc_codes FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

-- visits: customers can read their own visits
CREATE POLICY "visits_select_public"
  ON public.visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = visits.customer_id AND c.user_id = auth.uid()
    )
  );

-- reward_claims: customers can read their own claims
CREATE POLICY "reward_claims_select_public"
  ON public.reward_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = reward_claims.customer_id AND c.user_id = auth.uid()
    )
  );
