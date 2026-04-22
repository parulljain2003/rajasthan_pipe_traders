import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { CategoryModel } from "@/lib/db/models/Category";
import { serverFetchError } from "@/lib/http/apiError";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const { ids } = (await req.json()) as { ids: string[] };

    if (!Array.isArray(ids)) {
      return NextResponse.json({ message: "ids array is required" }, { status: 400 });
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Update each category with its new sort order
        const updates = ids.map((id, index) =>
          CategoryModel.updateOne(
            { _id: id },
            { $set: { sortOrder: index + 1 } },
            { session }
          )
        );
        await Promise.all(updates);
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return serverFetchError(e);
  }
}
