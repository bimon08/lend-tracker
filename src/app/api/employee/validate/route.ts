import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    // Use anon key to validate the key (RLS allows public SELECT)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const { data, error } = await supabase
      .from('employee_keys')
      .select('id, owner_id, key_code, label, is_active')
      .eq('key_code', code.toUpperCase())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
    }

    if (!data.is_active) {
      return NextResponse.json({ error: 'This code has been deactivated' }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      keyId: data.id,
      ownerId: data.owner_id,
      label: data.label,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
