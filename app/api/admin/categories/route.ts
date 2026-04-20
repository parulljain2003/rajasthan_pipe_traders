import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { CategoryModel } from "@/lib/db/models/Category";
import { serializeCategoryLean } from "@/lib/db/serialize";
import { serverFetchError } from "@/lib/http/apiError";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const includeInactive = req.nextUrl.searchParams.get("includeInactive") !== "false";
    const filter = includeInactive ? {} : { isActive: true };
    const rows = await CategoryModel.find(filter)
      .populate("parent", "name slug")
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    const data = rows.map((r) => serializeCategoryLean(r as Parameters<typeof serializeCategoryLean>[0])!);
    return NextResponse.json({ data });
  } catch (e) {
    return serverFetchError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slugRaw = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!name || !slugRaw) {
      return err("name and slug are required", 400);
    }
    const parentId = body.parent;
    let parent: mongoose.Types.ObjectId | null = null;
    if (parentId && typeof parentId === "string" && mongoose.Types.ObjectId.isValid(parentId)) {
      parent = new mongoose.Types.ObjectId(parentId);
    }
    const image =
      typeof body.image === "string" && body.image.trim() ? body.image.trim() : undefined;
    const doc = await CategoryModel.create({
      name,
      slug: slugRaw,
      image,
      description: typeof body.description === "string" ? body.description : undefined,
      parent,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      sourceSectionLabel:
        typeof body.sourceSectionLabel === "string" ? body.sourceSectionLabel : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    });
    const populated = await CategoryModel.findById(doc._id).populate("parent", "name slug").lean();
    return NextResponse.json({
      data: serializeCategoryLean(populated as Parameters<typeof serializeCategoryLean>[0]),
    });
  } catch (e) {
    if (e instanceof mongoose.mongo.MongoServerError && e.code === 11000) {
      return err("A category with this slug already exists", 409);
    }
    return serverFetchError(e);
  }
}
