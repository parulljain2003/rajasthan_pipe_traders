import { NextRequest, NextResponse } from "next/server";
import { getMediaApiBase } from "@/lib/media-proxy";

function unavailable() {
  return NextResponse.json(
    { message: "MEDIA_API_URL is not set. See docs/Cloudenary_MEDIA_API.md." },
    { status: 503 }
  );
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const base = getMediaApiBase();
  if (!base) return unavailable();
  const { id } = await ctx.params;
  const res = await fetch(`${base}/api/media/${encodeURIComponent(id)}`, { cache: "no-store" });
  const body = await res.text();
  const ct = res.headers.get("Content-Type") || "application/json";
  return new NextResponse(body, { status: res.status, headers: { "Content-Type": ct } });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const base = getMediaApiBase();
  if (!base) return unavailable();
  const { id } = await ctx.params;
  const payload = await req.text();
  const res = await fetch(`${base}/api/media/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  const body = await res.text();
  const ct = res.headers.get("Content-Type") || "application/json";
  return new NextResponse(body, { status: res.status, headers: { "Content-Type": ct } });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const base = getMediaApiBase();
  if (!base) return unavailable();
  const { id } = await ctx.params;
  const res = await fetch(`${base}/api/media/${encodeURIComponent(id)}`, { method: "DELETE" });
  const body = await res.text();
  const ct = res.headers.get("Content-Type") || "application/json";
  return new NextResponse(body, { status: res.status, headers: { "Content-Type": ct } });
}
