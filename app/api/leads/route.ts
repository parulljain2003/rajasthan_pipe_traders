import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { LeadModel } from "@/lib/db/models/Lead";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PHONE_RE = /^\d{10}$/;

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function normalizePhone(p: string): string {
  return p.replace(/\D/g, "");
}

/**
 * Create or update a lead by phone. Does not downgrade status from "ordered" to "non-ordered".
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const raw = typeof body.phone === "string" ? body.phone : "";
    const phone = normalizePhone(raw);
    if (!PHONE_RE.test(phone)) {
      return err("Valid 10-digit phone is required", 400);
    }

    const itemsInCart = Array.isArray(body.itemsInCart) ? body.itemsInCart : [];

    await connectDb();

    const existing = await LeadModel.findOne({ phone }).lean();
    const nextStatus: "non-ordered" | "ordered" =
      existing && existing.status === "ordered" ? "ordered" : "non-ordered";

    const row = await LeadModel.findOneAndUpdate(
      { phone },
      {
        $set: {
          itemsInCart,
          status: nextStatus,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json(
      {
        data: {
          id: row!._id instanceof mongoose.Types.ObjectId ? row!._id.toString() : String(row!._id),
          status: row!.status,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
