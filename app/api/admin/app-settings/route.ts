import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { AppSettingsModel } from "@/lib/db/models/AppSettings";

const GLOBAL_KEY = "global";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function GET() {
  try {
    await connectDb();
    let row = await AppSettingsModel.findOne({ key: GLOBAL_KEY }).lean();
    if (!row) {
      row = await AppSettingsModel.create({
        key: GLOBAL_KEY,
        minimumOrderInclGst: 25_000,
      }).then((d) => d.toObject());
    }
    return NextResponse.json({
      data: {
        minimumOrderInclGst: row.minimumOrderInclGst ?? 25_000,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDb();
    const body = (await req.json()) as Record<string, unknown>;
    const mov = body.minimumOrderInclGst;
    if (typeof mov !== "number" || !Number.isFinite(mov) || mov < 0) {
      return err("minimumOrderInclGst must be a non-negative number", 400);
    }
    const row = await AppSettingsModel.findOneAndUpdate(
      { key: GLOBAL_KEY },
      { $set: { minimumOrderInclGst: mov } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return NextResponse.json({
      data: {
        minimumOrderInclGst: row?.minimumOrderInclGst ?? mov,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
