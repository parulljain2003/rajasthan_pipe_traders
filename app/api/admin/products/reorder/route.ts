import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { ProductModel } from "@/lib/db/models/Product";
import { serverFetchError } from "@/lib/http/apiError";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const { updates } = (await req.json()) as { updates: { id: string; sortOrder: number }[] };

    if (!Array.isArray(updates)) {
      return NextResponse.json({ message: "updates array is required" }, { status: 400 });
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Update each product with its new sort order
        const updatePromises = updates.map((update) =>
          ProductModel.updateOne(
            { _id: update.id },
            { $set: { sortOrder: update.sortOrder } },
            { session }
          )
        );
        await Promise.all(updatePromises);
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return serverFetchError(e);
  }
}
