import { NextResponse } from "next/server";
import { getMinimumOrderInclGst } from "@/lib/db/appSettings";

/** Public: MOV and other storefront settings */
export async function GET() {
  try {
    const minimumOrderInclGst = await getMinimumOrderInclGst();
    return NextResponse.json({
      data: { minimumOrderInclGst },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
