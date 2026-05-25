-- Migration: initial TapIn schema
-- Rollback: DROP SCHEMA public CASCADE; CREATE SCHEMA public;

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- MERCHANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.merchants (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text          NOT NULL,
  slug          text          NOT NULL UNIQUE,
  logo_url      text,
  address       text,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON public.merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_slug    ON public.merchants(slug);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchants_select_own"
  ON public.merchants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "merchants_insert_own"
  ON public.merchants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "merchants_update_own"
  ON public.merchants FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  phone          text          UNIQUE,
  email          text          UNIQUE,
  display_name   text,
  points_balance integer       NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone   ON public.customers(phone);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select_own"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "customers_insert_own"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_update_own"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       uuid          NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name              text          NOT NULL,
  description       text,
  points_per_visit  integer       NOT NULL DEFAULT 1 CHECK (points_per_visit > 0),
  reward_threshold  integer       NOT NULL CHECK (reward_threshold > 0),
  reward_label      text          NOT NULL,
  starts_at         timestamptz   NOT NULL DEFAULT now(),
  ends_at           timestamptz,
  is_active         boolean       NOT NULL DEFAULT true,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_merchant_id ON public.campaigns(merchant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_is_active   ON public.campaigns(is_active);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_merchant_own"
  ON public.campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = campaigns.merchant_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "campaigns_insert_merchant_own"
  ON public.campaigns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = campaigns.merchant_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "campaigns_update_merchant_own"
  ON public.campaigns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = campaigns.merchant_id AND m.user_id = auth.uid()
    )
  );

-- Customers can read active campaigns (to display reward info after a tap)
CREATE POLICY "campaigns_select_active_public"
  ON public.campaigns FOR SELECT
  USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));

-- ============================================================
-- NFC CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nfc_codes (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  uuid          NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  campaign_id  uuid          NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  label        text,
  is_active    boolean       NOT NULL DEFAULT true,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfc_codes_merchant_id  ON public.nfc_codes(merchant_id);
CREATE INDEX IF NOT EXISTS idx_nfc_codes_campaign_id  ON public.nfc_codes(campaign_id);

ALTER TABLE public.nfc_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfc_codes_select_merchant_own"
  ON public.nfc_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = nfc_codes.merchant_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "nfc_codes_insert_merchant_own"
  ON public.nfc_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = nfc_codes.merchant_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "nfc_codes_update_merchant_own"
  ON public.nfc_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = nfc_codes.merchant_id AND m.user_id = auth.uid()
    )
  );

-- Authenticated users can read active NFC codes (needed to resolve a tap)
CREATE POLICY "nfc_codes_select_active_authed"
  ON public.nfc_codes FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

-- ============================================================
-- VISITS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visits (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid          NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  nfc_code_id   uuid          NOT NULL REFERENCES public.nfc_codes(id) ON DELETE CASCADE,
  campaign_id   uuid          NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  points_earned integer       NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  rejected      boolean       NOT NULL DEFAULT false,
  reject_reason text,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_customer_id  ON public.visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_nfc_code_id  ON public.visits(nfc_code_id);
CREATE INDEX IF NOT EXISTS idx_visits_campaign_id  ON public.visits(campaign_id);
CREATE INDEX IF NOT EXISTS idx_visits_created_at   ON public.visits(created_at DESC);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visits_select_own_customer"
  ON public.visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = visits.customer_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "visits_insert_own_customer"
  ON public.visits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = visits.customer_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "visits_select_merchant"
  ON public.visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.nfc_codes nc
      JOIN public.merchants m ON m.id = nc.merchant_id
      WHERE nc.id = visits.nfc_code_id AND m.user_id = auth.uid()
    )
  );

-- Merchants can read customers who have visited them (visits table now exists)
CREATE POLICY "customers_select_merchant"
  ON public.customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.visits v
      JOIN public.nfc_codes nc ON nc.id = v.nfc_code_id
      JOIN public.merchants m  ON m.id  = nc.merchant_id
      WHERE v.customer_id = customers.id
        AND m.user_id = auth.uid()
    )
  );

-- ============================================================
-- REWARD CLAIMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid          NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  campaign_id   uuid          NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  merchant_id   uuid          NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  points_spent  integer       NOT NULL CHECK (points_spent > 0),
  redeemed_at   timestamptz   NOT NULL DEFAULT now(),
  voided_at     timestamptz,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_customer_id ON public.reward_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_merchant_id ON public.reward_claims(merchant_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_campaign_id ON public.reward_claims(campaign_id);

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward_claims_select_own_customer"
  ON public.reward_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = reward_claims.customer_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "reward_claims_insert_own_customer"
  ON public.reward_claims FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = reward_claims.customer_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "reward_claims_select_merchant"
  ON public.reward_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = reward_claims.merchant_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "reward_claims_update_merchant"
  ON public.reward_claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = reward_claims.merchant_id AND m.user_id = auth.uid()
    )
  );

-- ============================================================
-- RPC: record_visit (atomic tap handler)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_visit(
  p_customer_id  uuid,
  p_nfc_code_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nfc_code     public.nfc_codes;
  v_campaign     public.campaigns;
  v_duplicate    boolean;
  v_new_balance  integer;
  v_visit_id     uuid;
BEGIN
  -- Resolve NFC code
  SELECT * INTO v_nfc_code FROM public.nfc_codes WHERE id = p_nfc_code_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NFC code not found or inactive', 'code', 'NFC_NOT_FOUND');
  END IF;

  -- Resolve campaign
  SELECT * INTO v_campaign
  FROM public.campaigns
  WHERE id = v_nfc_code.campaign_id
    AND is_active = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now());
  IF NOT FOUND THEN
    -- Record rejected visit for analytics
    INSERT INTO public.visits (customer_id, nfc_code_id, campaign_id, points_earned, rejected, reject_reason)
    VALUES (p_customer_id, p_nfc_code_id, v_nfc_code.campaign_id, 0, true, 'campaign_expired');
    RETURN jsonb_build_object('ok', false, 'error', 'Campaign is not active', 'code', 'CAMPAIGN_EXPIRED');
  END IF;

  -- Duplicate tap guard (5-minute cooldown per customer per NFC code)
  SELECT EXISTS (
    SELECT 1 FROM public.visits
    WHERE customer_id = p_customer_id
      AND nfc_code_id = p_nfc_code_id
      AND rejected = false
      AND created_at > now() - interval '5 minutes'
  ) INTO v_duplicate;

  IF v_duplicate THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too soon — please wait before tapping again', 'code', 'DUPLICATE_TAP');
  END IF;

  -- Record visit
  INSERT INTO public.visits (customer_id, nfc_code_id, campaign_id, points_earned)
  VALUES (p_customer_id, p_nfc_code_id, v_campaign.id, v_campaign.points_per_visit)
  RETURNING id INTO v_visit_id;

  -- Credit points
  UPDATE public.customers
  SET points_balance = points_balance + v_campaign.points_per_visit,
      updated_at     = now()
  WHERE id = p_customer_id
  RETURNING points_balance INTO v_new_balance;

  RETURN jsonb_build_object(
    'ok',              true,
    'visit_id',        v_visit_id,
    'points_earned',   v_campaign.points_per_visit,
    'new_balance',     v_new_balance,
    'reward_unlocked', v_new_balance >= v_campaign.reward_threshold
  );
END;
$$;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER merchants_updated_at   BEFORE UPDATE ON public.merchants   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER customers_updated_at   BEFORE UPDATE ON public.customers   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER campaigns_updated_at   BEFORE UPDATE ON public.campaigns   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER nfc_codes_updated_at   BEFORE UPDATE ON public.nfc_codes   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER reward_claims_updated_at BEFORE UPDATE ON public.reward_claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
