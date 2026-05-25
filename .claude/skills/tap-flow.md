# Skill: Tap Flow

## When to Use
Use this skill whenever you are adding, changing, or debugging the core tap-in flow: the sequence from a customer tapping an NFC tag (or scanning a QR code) to points being credited to their account.

## Flow Overview
```
Customer device
  → reads NFC tag (NDEF record) or scans QR code
  → extracts `nfc_code` UUID
  → calls POST /api/tap { nfc_code_id, customer_id }
  → server validates code, checks campaign, guards duplicates
  → inserts row into `visits`
  → increments `customers.points_balance`
  → returns { points_earned, new_balance, reward_unlocked? }
Customer device
  → shows confirmation UI
```

## Implementation Checklist
- [ ] `nfc_codes` row must be `active = true`
- [ ] `nfc_codes.merchant_id` campaign must be active (`now()` between `starts_at` and `ends_at`)
- [ ] Duplicate tap guard: reject if a `visits` row exists for the same `(customer_id, nfc_code_id)` within the last 5 minutes (use `created_at > now() - interval '5 minutes'`)
- [ ] Wrap the visit insert + points increment in a single Supabase RPC call (Postgres function) to ensure atomicity
- [ ] Return `reward_unlocked: true` if `new_balance >= campaign.reward_threshold`
- [ ] Log the tap even on rejection so merchants can see attempted taps in analytics

## Key Files
- `apps/customer/app/tap/page.tsx` — initiates NFC read or QR scan
- `apps/customer/app/api/tap/route.ts` — server handler
- `supabase/migrations/` — `record_visit` RPC definition

## Edge Cases
- NFC tag not found (404)
- Campaign expired (410 Gone)
- Duplicate tap within cooldown (409 Conflict)
- Customer not yet registered — auto-create anonymous customer record, prompt registration later
- Offline device — queue tap locally in IndexedDB, sync when back online
