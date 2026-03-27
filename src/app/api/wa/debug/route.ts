// src/app/api/wa/debug/route.ts
// Debug endpoint — check wa_users data
import { NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin, supabase } from "@/lib/supabase";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const db = getSupabaseAdmin() || supabase;
  const { data, error } = await db.from("wa_users").select("*");

  return NextResponse.json({
    configured: isSupabaseConfigured,
    has_admin: !!getSupabaseAdmin(),
    wa_users_count: data?.length || 0,
    wa_users: data || [],
    error: error?.message || null,
  });
}
