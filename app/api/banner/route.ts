import { NextResponse } from "next/server";
import { getHomeBanner } from "@/lib/banner/resolveHomeBanner";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function GET() {
  try {
    const data = await getHomeBanner();
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
