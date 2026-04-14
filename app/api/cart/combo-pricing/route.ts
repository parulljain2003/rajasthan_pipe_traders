import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { ComboModel } from "@/lib/db/models/Combo";
import { ProductModel } from "@/lib/db/models/Product";
import { getMinimumOrderInclGst } from "@/lib/db/appSettings";
import { comboDocToRule } from "@/lib/combo/mapComboDoc";
import {
  resolveCartComboPricing,
  type IncomingCartLineForCombo,
  type LeanProductForCombo,
} from "@/lib/combo/resolveCartComboPricing";
import type { CartOrderMode } from "@/lib/cart/packetLine";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function parseOrderMode(raw: unknown): CartOrderMode {
  if (raw === "master_bag") return "master_bag";
  if (raw === "carton") return "carton";
  return "packets";
}

function parseLines(raw: unknown): IncomingCartLineForCombo[] | null {
  if (!Array.isArray(raw)) return null;
  const out: IncomingCartLineForCombo[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const size = typeof o.size === "string" ? o.size : "";
    if (!size.trim()) continue;
    const quantity = typeof o.quantity === "number" ? o.quantity : Number(o.quantity);
    if (!Number.isFinite(quantity)) continue;
    const mongoProductId =
      typeof o.mongoProductId === "string" && o.mongoProductId.trim()
        ? o.mongoProductId.trim()
        : undefined;
    const productId =
      o.productId !== undefined && o.productId !== null
        ? typeof o.productId === "number"
          ? o.productId
          : Number(o.productId)
        : undefined;
    const orderMode = parseOrderMode(o.orderMode);
    const packetsPerCartonRaw = o.packetsPerCarton;
    const packetsPerCarton =
      typeof packetsPerCartonRaw === "number"
        ? packetsPerCartonRaw
        : Number(packetsPerCartonRaw) || undefined;
    out.push({
      mongoProductId,
      productId: Number.isFinite(productId) ? productId : undefined,
      productSlug: typeof o.productSlug === "string" ? o.productSlug : undefined,
      size,
      sellerId: typeof o.sellerId === "string" ? o.sellerId : undefined,
      orderMode,
      quantity,
      qtyPerBag: typeof o.qtyPerBag === "number" ? o.qtyPerBag : Number(o.qtyPerBag) || 0,
      pcsPerPacket: typeof o.pcsPerPacket === "number" ? o.pcsPerPacket : Number(o.pcsPerPacket) || 1,
      packetsPerCarton:
        orderMode === "carton" && packetsPerCarton != null && Number.isFinite(packetsPerCarton)
          ? Math.max(0, packetsPerCarton)
          : undefined,
      pricePerUnit: typeof o.pricePerUnit === "number" ? o.pricePerUnit : Number(o.pricePerUnit) || 0,
      basicPricePerUnit:
        typeof o.basicPricePerUnit === "number" ? o.basicPricePerUnit : Number(o.basicPricePerUnit) || 0,
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const lines = parseLines(body.lines);
    if (lines === null) return err("lines must be an array", 400);
    const preferListOverCombo = body.preferListOverCombo === true;

    await connectDb();
    const ids = [
      ...new Set(
        lines
          .map((l) => l.mongoProductId)
          .filter((id): id is string => Boolean(id && mongoose.Types.ObjectId.isValid(id)))
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const products =
      ids.length > 0
        ? await ProductModel.find({ _id: { $in: ids } })
            .select("sizes sellers pricing sizeOrModel slug legacyId category packaging")
            .lean()
        : [];

    const productByMongoId = new Map<string, LeanProductForCombo>();
    for (const p of products) {
      productByMongoId.set(p._id.toString(), p as unknown as LeanProductForCombo);
    }

    const comboRows = await ComboModel.find({ isActive: true }).sort({ priority: 1 }).lean();
    const comboRules = comboRows.map((c) => comboDocToRule(c as Parameters<typeof comboDocToRule>[0]));

    const result = resolveCartComboPricing(lines, productByMongoId, comboRules, {
      skipComboAllocation: preferListOverCombo,
    });
    const minimumOrderInclGst = await getMinimumOrderInclGst();

    return NextResponse.json({
      data: {
        lines: result.lines,
        eligiblePacketTotal: result.eligiblePacketTotal,
        corePacketTotal: result.corePacketTotal,
        comboMatchedCorePackets: result.comboMatchedCorePackets,
        cartTotalInclGst: result.cartTotalInclGst,
        cartBasicTotal: result.cartBasicTotal,
        comboSavingsInclGst: result.comboSavingsInclGst,
        smartSuggestion: result.smartSuggestion,
        minimumOrderInclGst,
        minimumOrderMet: result.cartTotalInclGst >= minimumOrderInclGst,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
