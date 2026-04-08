import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { CouponModel } from "@/lib/db/models/Coupon";
import { isCouponInSchedule, toPublicCouponBanner } from "@/lib/coupons/evaluate";

/** DB-backed list must not be statically cached at build time */
export const dynamic = "force-dynamic";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

/**
 * Public coupons for banner strip and cart picker.
 * ?banner=1 — only coupons with displayInBanner
 * ?cart=1 — only coupons with showInCart
 */
export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const sp = req.nextUrl.searchParams;
    const now = new Date();
    const filter: Record<string, unknown> = { isActive: true };
    if (sp.get("banner") === "1" || sp.get("banner") === "true") {
      filter.displayInBanner = true;
    }
    if (sp.get("cart") === "1" || sp.get("cart") === "true") {
      filter.showInCart = true;
    }
    const rows = await CouponModel.find(filter).sort({ sortOrder: 1, code: 1 }).lean();
    const inWindow = rows.filter((r) =>
      isCouponInSchedule(
        {
          startAt: r.startAt ?? undefined,
          endAt: r.endAt ?? undefined,
        },
        now
      )
    );
    const data = inWindow.map((r) => toPublicCouponBanner(r as Record<string, unknown>));
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
