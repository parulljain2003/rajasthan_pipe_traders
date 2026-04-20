import { NextResponse } from "next/server";

/** JSON body for unexpected handler failures (matches client expectations via `details` + `message`). */
export function serverFetchError(e: unknown, status = 500) {
  const details = e instanceof Error ? e.message : String(e);
  return NextResponse.json(
    { error: "Failed to fetch data", details, message: details },
    { status }
  );
}
