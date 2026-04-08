import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { CategoryModel } from "@/lib/db/models/Category";
import { ProductModel } from "@/lib/db/models/Product";
import { serializeCategoryLean } from "@/lib/db/serialize";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return err("Invalid category id", 400);
    }
    await connectDb();
    const row = await CategoryModel.findById(id).populate("parent", "name slug").lean();
    if (!row) return err("Category not found", 404);
    return NextResponse.json({
      data: serializeCategoryLean(row as Parameters<typeof serializeCategoryLean>[0]),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return err("Invalid category id", 400);
    }
    await connectDb();
    const body = (await req.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.slug === "string") patch.slug = body.slug.trim().toLowerCase();
    if (typeof body.description === "string") patch.description = body.description;
    if ("image" in body) {
      if (body.image === null || body.image === "") {
        unset.image = 1;
      } else if (typeof body.image === "string") {
        patch.image = body.image.trim();
      }
    }
    if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;
    if (typeof body.sourceSectionLabel === "string") patch.sourceSectionLabel = body.sourceSectionLabel;
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    if ("parent" in body) {
      const p = body.parent;
      if (p === null || p === "") {
        patch.parent = null;
      } else if (typeof p === "string" && mongoose.Types.ObjectId.isValid(p)) {
        if (p === id) return err("Category cannot be its own parent", 400);
        patch.parent = new mongoose.Types.ObjectId(p);
      }
    }
    const update: { $set?: Record<string, unknown>; $unset?: Record<string, 1> } = {};
    if (Object.keys(patch).length) update.$set = patch;
    if (Object.keys(unset).length) update.$unset = unset;
    let row;
    if (Object.keys(update).length === 0) {
      row = await CategoryModel.findById(id).populate("parent", "name slug").lean();
    } else {
      row = await CategoryModel.findByIdAndUpdate(id, update, { new: true, runValidators: true })
        .populate("parent", "name slug")
        .lean();
    }
    if (!row) return err("Category not found", 404);
    return NextResponse.json({
      data: serializeCategoryLean(row as Parameters<typeof serializeCategoryLean>[0]),
    });
  } catch (e) {
    if (e instanceof mongoose.mongo.MongoServerError && e.code === 11000) {
      return err("A category with this slug already exists", 409);
    }
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return err("Invalid category id", 400);
    }
    await connectDb();
    const oid = new mongoose.Types.ObjectId(id);
    const productCount = await ProductModel.countDocuments({ category: oid });
    if (productCount > 0) {
      return err(`Cannot delete: ${productCount} product(s) still reference this category`, 409);
    }
    const childCount = await CategoryModel.countDocuments({ parent: oid });
    if (childCount > 0) {
      return err(`Cannot delete: ${childCount} subcategor(ies) still reference this category`, 409);
    }
    const deleted = await CategoryModel.findByIdAndDelete(id).lean();
    if (!deleted) return err("Category not found", 404);
    return NextResponse.json({ data: { _id: id, deleted: true } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
