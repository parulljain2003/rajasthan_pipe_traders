import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { OrderModel } from "@/lib/db/models/Order";
import { LeadModel } from "@/lib/db/models/Lead";
import { orderSerialFromMongoId } from "@/lib/utils/orderSerialFromId";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

const PHONE_RE = /^\d{10}$/;

function parseOrderSummary(
  body: Record<string, unknown>
): Record<string, unknown> | null | undefined {
  const o = body.orderSummary;
  if (o == null) return undefined;
  if (typeof o === "object" && !Array.isArray(o)) {
    return o as Record<string, unknown>;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone =
      typeof body.customerPhone === "string" ? body.customerPhone.replace(/\D/g, "") : "";
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
    const cartItemsRaw = body.cartItems;
    const orderSummary = parseOrderSummary(body);

    const totalFromBody = body.totalPrice;
    const totalFromSummary =
      orderSummary && typeof orderSummary["finalTotal"] === "number"
        ? (orderSummary["finalTotal"] as number)
        : typeof orderSummary?.["grandTotalInclGst"] === "number"
          ? (orderSummary["grandTotalInclGst"] as number)
          : null;
    const totalPrice =
      typeof totalFromBody === "number" && Number.isFinite(totalFromBody)
        ? totalFromBody
        : totalFromSummary;

    if (typeof body.customerPhone !== "string" || !body.customerPhone.trim()) {
      return err("customerPhone is required", 400);
    }

    if (!PHONE_RE.test(customerPhone)) {
      return err("Phone must be exactly 10 digits", 400);
    }

    if (!Array.isArray(cartItemsRaw) || cartItemsRaw.length === 0) {
      return err("cartItems must be a non-empty array", 400);
    }

    if (orderSummary === null) {
      return err("orderSummary, if present, must be an object", 400);
    }

    if (totalPrice == null || typeof totalPrice !== "number" || !Number.isFinite(totalPrice) || totalPrice < 0) {
      return err("totalPrice is required and must be a non-negative number", 400);
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return err("Invalid email address", 400);
    }

    await connectDb();

    const row = await OrderModel.create({
      customerName,
      customerPhone,
      customerEmail,
      cartItems: cartItemsRaw,
      totalPrice,
      ...(orderSummary != null ? { orderSummary } : {}),
    });

    try {
      await LeadModel.findOneAndUpdate(
        { phone: customerPhone },
        {
          $set: {
            status: "ordered",
            itemsInCart: cartItemsRaw,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, new: true }
      );
    } catch {
      /* lead update is best-effort */
    }

    const o = row.toObject();
    const id = o._id instanceof mongoose.Types.ObjectId ? o._id.toString() : String(o._id);
    const cAt = o.createdAt;
    const dateIso = cAt instanceof Date ? cAt.toISOString() : new Date().toISOString();
    const serialNo = orderSerialFromMongoId(id);

    return NextResponse.json(
      {
        data: {
          id,
          serialNo,
          createdAt: dateIso,
          customerName: o.customerName ?? "",
          customerPhone: o.customerPhone,
          customerEmail: o.customerEmail ?? "",
          totalPrice: o.totalPrice,
          orderSummary: (o.orderSummary as Record<string, unknown> | undefined) ?? {},
          cartItems: (o.cartItems as unknown[]) ?? [],
        },
      },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
