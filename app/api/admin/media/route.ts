import { NextRequest, NextResponse } from "next/server";
import { getMediaApiBase } from "@/lib/media-proxy";

function unavailable() {
  return NextResponse.json(
    {
      message:
        "MEDIA_API_URL is not set. Add it to .env.local (your Express API base, e.g. http://localhost:5000). See docs/Cloudenary_MEDIA_API.md.",
    },
    { status: 503 }
  );
}

export async function GET(req: NextRequest) {
  const base = getMediaApiBase();
  if (!base) return unavailable();
  const qs = req.nextUrl.searchParams.toString();
  const url = `${base}/api/media${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.text();
  const ct = res.headers.get("Content-Type") || "application/json";
  return new NextResponse(body, { status: res.status, headers: { "Content-Type": ct } });
}

export async function POST(req: NextRequest) {
  const base = getMediaApiBase();
  if (!base) return unavailable();
  const formData = await req.formData();
  const res = await fetch(`${base}/api/media`, { method: "POST", body: formData });
  const body = await res.text();
  const ct = res.headers.get("Content-Type") || "application/json";
  return new NextResponse(body, { status: res.status, headers: { "Content-Type": ct } });
}
