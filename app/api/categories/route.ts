import { NextResponse } from "next/server";
import { getStorefrontCategories } from "@/lib/catalog/storefront";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

/** Public catalog: active categories only (storefront). */
export async function GET() {
  try {
    const data = await getStorefrontCategories();
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
