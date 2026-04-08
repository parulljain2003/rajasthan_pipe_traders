import { NextRequest, NextResponse } from "next/server";
import { getMediaApiBase } from "@/lib/media-proxy";

function unavailable() {
  return NextResponse.json(
    { message: "MEDIA_API_URL is not set. See docs/Cloudenary_MEDIA_API.md." },
    { status: 503 }
  );
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const base = getMediaApiBase();
  if (!base) return unavailable();
  const { id } = await ctx.params;
  const formData = await req.formData();
  const res = await fetch(`${base}/api/media/${encodeURIComponent(id)}/replace`, {
    method: "POST",
    body: formData,
  });
  const body = await res.text();
  const ct = res.headers.get("Content-Type") || "application/json";
  return new NextResponse(body, { status: res.status, headers: { "Content-Type": ct } });
}
