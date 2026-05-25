# Skill: Next.js API Route

## When to Use
Use this skill when creating a new server-side endpoint in either Next.js app. All endpoints live under `app/api/` and use the App Router route handler convention.

## File Convention
```
app/api/<resource>/route.ts          — collection (GET list, POST create)
app/api/<resource>/[id]/route.ts     — item (GET one, PATCH update, DELETE)
```

## Boilerplate
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const BodySchema = z.object({
  // define shape here
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("table_name")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("[api/resource POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

## Checklist
- [ ] Parse and validate body with `zod` before any DB call
- [ ] Authenticate with `supabase.auth.getUser()` — never trust headers alone
- [ ] Log errors server-side with context tag (e.g., `[api/tap POST]`)
- [ ] Return structured `{ error: string }` JSON on all failure paths
- [ ] Export only the HTTP methods the route actually handles
