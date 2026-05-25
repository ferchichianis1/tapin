import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

const bodySchema = z.object({
  merchantSlug: z.string().min(1),
});

interface RecordVisitSuccess {
  ok: true;
  visit_id: string;
  points_earned: number;
  new_balance: number;
  reward_unlocked: boolean;
}

interface RecordVisitFailure {
  ok: false;
  error: string;
  code: string;
}

type RecordVisitResult = RecordVisitSuccess | RecordVisitFailure;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const { merchantSlug } = parsed.data;

  // 2. Auth: extract Bearer token and validate
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    console.error('[api/tap] Auth validation failed:', userError?.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authenticatedUser = userData.user;

  // 3. Look up merchant by slug
  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('id')
    .eq('slug', merchantSlug)
    .single();

  if (merchantError || !merchant) {
    if (merchantError && merchantError.code !== 'PGRST116') {
      console.error('[api/tap] Merchant lookup error:', merchantError.message);
    }
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }

  // 4. Look up an active nfc_codes row for that merchant with an active campaign
  const { data: nfcCode, error: nfcError } = await supabaseAdmin
    .from('nfc_codes')
    .select('id, campaign_id, campaigns!inner(is_active, starts_at, ends_at)')
    .eq('merchant_id', merchant.id)
    .eq('is_active', true)
    .eq('campaigns.is_active', true)
    .limit(1)
    .single();

  if (nfcError || !nfcCode) {
    if (nfcError && nfcError.code !== 'PGRST116') {
      console.error('[api/tap] NFC code lookup error:', nfcError.message);
    }
    return NextResponse.json({ error: 'No active campaign' }, { status: 404 });
  }

  // 5. Look up or create the customers row
  const { data: existingCustomer, error: customerLookupError } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('user_id', authenticatedUser.id)
    .single();

  let customerId: string;

  if (customerLookupError && customerLookupError.code !== 'PGRST116') {
    console.error('[api/tap] Customer lookup error:', customerLookupError.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert({
        user_id: authenticatedUser.id,
        email: authenticatedUser.email ?? null,
      })
      .select('id')
      .single();

    if (insertError || !newCustomer) {
      console.error('[api/tap] Customer insert error:', insertError?.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    customerId = newCustomer.id;
  }

  // 6. Call the record_visit RPC
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('record_visit', {
    p_customer_id: customerId,
    p_nfc_code_id: nfcCode.id,
  });

  if (rpcError) {
    console.error('[api/tap] record_visit RPC error:', rpcError.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const result = rpcData as RecordVisitResult;

  // 7. Map RPC result to HTTP response
  if (!result.ok) {
    if (result.code === 'DUPLICATE_TAP') {
      return NextResponse.json({ error: 'Too soon — come back later' }, { status: 429 });
    }
    if (result.code === 'CAMPAIGN_EXPIRED') {
      return NextResponse.json({ error: 'Campaign has ended' }, { status: 410 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { points_earned, new_balance, reward_unlocked } = result;

  const progressMessage = reward_unlocked
    ? 'Reward unlocked! Show this to claim.'
    : `${new_balance} visit(s) — keep it up!`;

  return NextResponse.json({
    pointsEarned: points_earned,
    newBalance: new_balance,
    rewardUnlocked: reward_unlocked,
    progressMessage,
  });
}
