import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  const db = getDb();
  const ledger = db
    .prepare(`SELECT deposit_balance, fee_balance FROM ledger_accounts WHERE user_id = ?`)
    .get(user.id) as { deposit_balance: number; fee_balance: number } | undefined;

  return NextResponse.json({
    user,
    ledger: ledger ?? { deposit_balance: 0, fee_balance: 0 },
  });
}
