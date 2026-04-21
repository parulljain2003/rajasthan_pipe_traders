import { NextResponse } from "next/server";
import { getMinimumOrderInclGst, getPricesEffectiveDate } from "@/lib/db/appSettings";

/** Public: MOV and other storefront settings */
export async function GET() {
  try {
    const minimumOrderInclGst = await getMinimumOrderInclGst();
    const pricesEffectiveDate = await getPricesEffectiveDate();
    return NextResponse.json({
      data: { minimumOrderInclGst, pricesEffectiveDate },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
