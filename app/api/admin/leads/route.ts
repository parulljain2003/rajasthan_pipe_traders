import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { LeadModel } from "@/lib/db/models/Lead";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function GET() {
  try {
    await connectDb();
    const rows = await LeadModel.find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    return NextResponse.json(
      { data: rows },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
