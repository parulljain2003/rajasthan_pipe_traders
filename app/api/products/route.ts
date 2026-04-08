import { NextRequest, NextResponse } from "next/server";
import { getStorefrontProductsFromSearchParams } from "@/lib/catalog/storefront";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

/** Public catalog: active products only (storefront). */
export async function GET(req: NextRequest) {
  try {
    const result = await getStorefrontProductsFromSearchParams(req.nextUrl.searchParams);
    if (!result.ok) {
      return err(result.message, result.status);
    }
    return NextResponse.json({
      data: result.data,
      meta: result.meta,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
