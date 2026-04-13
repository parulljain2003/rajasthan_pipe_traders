import { connectDb } from "@/lib/db/connect";
import { AppSettingsModel } from "@/lib/db/models/AppSettings";

const GLOBAL_KEY = "global";

export async function getMinimumOrderInclGst(): Promise<number> {
  await connectDb();
  const row = await AppSettingsModel.findOne({ key: GLOBAL_KEY }).select("minimumOrderInclGst").lean();
  const n = row?.minimumOrderInclGst;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) return n;
  return 25_000;
}
