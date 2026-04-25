"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApiProductSize } from "@/app/lib/api/types";
import type { KeyFeatureIcon } from "@/app/data/products";
import { normalizeKeyFeatureIcon } from "@/app/lib/sanitizeKeyFeatures";
import { MediaImageField } from "../components/MediaImageField";
import AdminProductSearchBar from "../components/AdminProductSearchBar";
import type { AdminCategory, AdminProduct } from "../types";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { SortableProductRow } from "./SortableProductRow";

const pageSize = 25;

/** Primary cart unit — derived from inner (packet/box) first, then bulk (bags/carton) */
type PackagingPricingUnit =
  | "per_piece"
  | "per_packet"
  | "per_box"
  | "per_cartoon"
  | "per_dozen"
  | "per_bag"
  | "per_master_bag"
  | "other";

const BULK_UNIT_OPTIONS = [
  { value: "per_bag", label: "Bags" },
  { value: "per_cartoon", label: "Carton" },
] as const;

const INNER_UNIT_OPTIONS = [
  { value: "per_packet", label: "Packets" },
  { value: "per_box", label: "Box" },
] as const;

/** Select value for “Add new” — stored as `custom:label` */
const UNIT_ADD_NEW = "__add_new__";

const KEY_FEATURE_ICON_OPTIONS: { value: KeyFeatureIcon; label: string }[] = [
  { value: "check", label: "Checkmark" },
  { value: "material", label: "Info / material" },
  { value: "dot", label: "Dot" },
];

function migrateBulkSegment(raw: string): string {
  const t = raw.trim();
  if (!t) return "per_bag";
  if (t.startsWith("custom:")) return t;
  if (t === "per_bag" || t === "per_cartoon") return t;
  return `custom:${t}`;
}

function migrateInnerSegment(raw: string): string {
  const t = raw.trim();
  if (!t) return "per_packet";
  if (t.startsWith("custom:")) return t;
  if (t === "per_packet" || t === "per_box") return t;
  return `custom:${t}`;
}

function normalizeBulkUnitsForSave(arr: string[] | undefined): string[] {
  const out: string[] = [];
  for (const s of arr ?? []) {
    const t = String(s ?? "").trim();
    if (!t) continue;
    if (t.startsWith("custom:")) {
      const label = t.slice(7).trim();
      if (label) out.push(`custom:${label}`);
    } else if (t === "per_bag" || t === "per_cartoon") {
      out.push(t);
    }
  }
  return out.length ? out : ["per_bag"];
}

function normalizeInnerUnitsForSave(arr: string[] | undefined): string[] {
  const out: string[] = [];
  for (const s of arr ?? []) {
    const t = String(s ?? "").trim();
    if (!t) continue;
    if (t.startsWith("custom:")) {
      const label = t.slice(7).trim();
      if (label) out.push(`custom:${label}`);
    } else if (t === "per_packet" || t === "per_box") {
      out.push(t);
    }
  }
  return out.length ? out : ["per_packet"];
}

function segmentToPricing(segment: string): PackagingPricingUnit {
  if (segment.startsWith("custom:")) return "other";
  if (
    segment === "per_piece" ||
    segment === "per_packet" ||
    segment === "per_box" ||
    segment === "per_cartoon" ||
    segment === "per_dozen" ||
    segment === "per_bag" ||
    segment === "per_master_bag" ||
    segment === "other"
  ) {
    return segment;
  }
  return "other";
}

function primaryPricingUnit(inner: string[], bulk: string[]): PackagingPricingUnit {
  if (inner[0]) return segmentToPricing(inner[0]);
  if (bulk[0]) return segmentToPricing(bulk[0]);
  return "per_piece";
}

/** Human-readable min-order line for admin / listings */
function buildMinOrderLine(
  moq: number | undefined,
  moqBags: number | undefined,
  packetsPerBag: number,
  bulk: string[],
  inner: string[],
): string | undefined {
  const hasBag = bulk.some((s) => s === "per_bag");
  const hasPacket = inner.some((s) => s === "per_packet");
  const parts: string[] = [];
  if (hasBag && hasPacket && packetsPerBag > 0) {
    parts.push(`1 bag = ${packetsPerBag} packets`);
  }
  if (moq != null && moq > 0) parts.push(`MOQ ${moq} packets`);
  if (moqBags != null && moqBags > 0 && packetsPerBag > 0) parts.push(`MOQ ${moqBags} bags`);
  return parts.length ? parts.join(" · ") : undefined;
}

type ProductFromApi = AdminProduct & {
  sizeOrModel?: string;
  isIsiCertified?: boolean;
  features?: string[];
  keyFeatures?: Array<{ text?: string; icon?: string }>;
  moq?: number;
  moqBags?: number;
  minOrder?: string;
  packaging?: {
    pricingUnit?: string;
    bulkUnitChoices?: string[];
    innerUnitChoices?: string[];
    pcsPerPacket?: number;
    packetsInMasterBag?: number;
    pktInMasterBag?: number;
  };
  sizes?: Array<{ size?: string; pcsPerPacket?: number; qtyPerBag?: number }>;
};

function loadBulkFromProduct(p: ProductFromApi): string[] {
  const raw = p.packaging?.bulkUnitChoices;
  if (Array.isArray(raw) && raw.length) {
    return raw.map((x) => migrateBulkSegment(String(x)));
  }
  const u = p.packaging?.pricingUnit;
  if (u === "per_bag" || u === "per_cartoon") return [u];
  return ["per_bag"];
}

function loadInnerFromProduct(p: ProductFromApi): string[] {
  const raw = p.packaging?.innerUnitChoices;
  if (Array.isArray(raw) && raw.length) {
    return raw.map((x) => migrateInnerSegment(String(x)));
  }
  const u = p.packaging?.pricingUnit;
  if (u === "per_packet" || u === "per_box") return [u];
  return ["per_packet"];
}

function loadKeyFeatureRowsFromProduct(p: ProductFromApi): Array<{ text: string; icon: KeyFeatureIcon }> {
  const kf = p.keyFeatures;
  if (Array.isArray(kf) && kf.length > 0) {
    return kf.map((row) => ({
      text: typeof row?.text === "string" ? row.text : "",
      icon: normalizeKeyFeatureIcon(row?.icon),
    }));
  }
  const legacy = p.features;
  if (Array.isArray(legacy) && legacy.length > 0) {
    return legacy.map((line) => ({
      text: String(line ?? ""),
      icon: "check" as KeyFeatureIcon,
    }));
  }
  return [];
}

/** One catalog size row from base pricing; clear multi-seller lists from the simplified form */
function buildSizesAndSellers(
  productKind: "sku" | "catalog",
  sizeLabel: string,
  basicPrice: number,
  priceWithGst: number,
  pcsPerPacket: number,
  packetsPerBag: number,
): { sizes?: ApiProductSize[]; sellers: [] } {
  if (productKind !== "catalog") {
    return { sellers: [] };
  }
  const size = String(sizeLabel ?? "").trim() || "Standard";
  const ppp = pcsPerPacket > 0 ? Math.floor(pcsPerPacket) : 1;
  const qpb = packetsPerBag > 0 ? Math.floor(packetsPerBag) : 0;
  return {
    sizes: [{ size, basicPrice, priceWithGst, pcsPerPacket: ppp, qtyPerBag: qpb }],
    sellers: [],
  };
}

/** Aligns with API `parseSortOrderInput`; keeps `0` valid (do not use `|| 0` on the number). */
function sortOrderFromForm(sortOrder: number): number {
  const n = Number(sortOrder);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

const emptyForm = {
  sku: "",
  name: "",
  productKind: "catalog" as "sku" | "catalog",
  slug: "",
  categoryId: "",
  description: "",
  brand: "",
  basicPrice: "",
  priceWithGst: "",
  currency: "INR",
  isActive: true,
  isNew: false,
  isIsiCertified: false,
  sizeLabel: "",
  bulkUnits: ["per_bag"] as string[],
  innerUnits: ["per_packet"] as string[],
  moq: "",
  moqBags: "",
  pcsPerPacket: "100",
  packetsPerBag: "",
  imagesJson: "[]",
  keyFeatureRows: [] as Array<{ text: string; icon: KeyFeatureIcon }>,
  sortOrder: 0,
};

export default function AdminProductsPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [list, setList] = useState<AdminProduct[]>([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sortConflict, setSortConflict] = useState<{
    _id: string;
    name: string;
    sortOrder: number;
  } | null>(null);
  const appliedSearchRef = useRef("");
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [sortChecking, setSortChecking] = useState(false);
  /** True after “Check” found no conflict for the current category + sort value */
  const [sortOrderCheckOk, setSortOrderCheckOk] = useState(false);
  /** Sort order loaded from DB when opening edit (used for swap confirmation) */
  const [editBaselineSortOrder, setEditBaselineSortOrder] = useState<number | null>(null);

  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeProduct = activeProductId
    ? list.find((product) => product._id === activeProductId) ?? null
    : null;
  const pageSlice = useMemo(
    () => list.slice(page * pageSize, page * pageSize + pageSize),
    [list, page]
  );

  /** Both packing fields set → storefront uses packing only; separate MOQ fields hidden and cleared on save */
  const packingReplacesMoq = useMemo(() => {
    if (form.productKind !== "catalog") return false;
    const ppbRaw = String(form.packetsPerBag ?? "").trim();
    if (!ppbRaw) return false;
    const ppb = Math.floor(Number(ppbRaw));
    if (!Number.isFinite(ppb) || ppb <= 0) return false;
    const ppp = Math.max(1, Math.floor(Number(form.pcsPerPacket) || 1));
    return ppp >= 1;
  }, [form.productKind, form.packetsPerBag, form.pcsPerPacket]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories?includeInactive=true", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) return;
      setCategories(json.data as AdminCategory[]);
    } catch {
      /* ignore */
    }
  }, []);

  const loadProducts = useCallback(async (nextSearch?: string, scrollToId?: string) => {
    const searchTerm = nextSearch !== undefined ? nextSearch : appliedSearchRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "500", skip: "0" });
      const trimmed = searchTerm.trim();
      if (trimmed) params.set("q", trimmed);
      appliedSearchRef.current = trimmed;
      const res = await fetch(`/api/admin/products?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      const rows = json.data as Array<AdminProduct & { isEligibleForCombo?: unknown }>;
      const visibleRows = rows.filter((p) => {
        const v = p.isEligibleForCombo;
        return v === null || (typeof v === "string" && v.trim() === "");
      });
      setList(visibleRows);
      setMeta({
        total: visibleRows.length,
      });
      if (scrollToId) {
        const index = visibleRows.findIndex((product) => product._id === scrollToId);
        setPage(index >= 0 ? Math.floor(index / pageSize) : 0);
      } else if (nextSearch !== undefined) {
        setPage(0);
      }
      setPendingScrollId(scrollToId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setList([]);
      setMeta({ total: 0 });
      setPendingScrollId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadProducts("");
  }, [loadProducts]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(meta.total / pageSize) - 1);
    if (meta.total === 0) setPage(0);
    else if (page > maxPage) setPage(maxPage);
  }, [meta.total, page]);

  useEffect(() => {
    if (!pendingScrollId || loading) return;
    const id = pendingScrollId;
    const el = document.getElementById(`admin-row-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("admin-row-highlight");
      window.setTimeout(() => {
        el.classList.remove("admin-row-highlight");
        setPendingScrollId(null);
      }, 2200);
    } else {
      setPendingScrollId(null);
    }
  }, [list, pendingScrollId, loading]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setSortConflict(null);
    setSortOrderCheckOk(false);
    setEditBaselineSortOrder(null);
    setModalOpen(true);
  }

  async function openEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      const p = json.data as ProductFromApi;
      setEditingId(id);

      const firstSize =
        Array.isArray(p.sizes) && p.sizes[0] && typeof p.sizes[0].size === "string"
          ? p.sizes[0].size
          : "";
      const sizeLabel =
        (typeof p.sizeOrModel === "string" && p.sizeOrModel.trim()) || firstSize || "";

      const s0 =
        Array.isArray(p.sizes) && p.sizes[0]
          ? (p.sizes[0] as { pcsPerPacket?: number; qtyPerBag?: number })
          : {};
      const pack = p.packaging;
      const qtyFromSize = typeof s0.qtyPerBag === "number" ? Math.max(0, Math.floor(s0.qtyPerBag)) : 0;
      const pktFromPack = Math.max(
        0,
        Math.floor(Number(pack?.packetsInMasterBag ?? pack?.pktInMasterBag ?? 0) || 0),
      );
      const packetsPerBagResolved = qtyFromSize > 0 ? qtyFromSize : pktFromPack;
      const pcsResolved =
        typeof s0.pcsPerPacket === "number" && s0.pcsPerPacket > 0
          ? Math.floor(s0.pcsPerPacket)
          : pack?.pcsPerPacket != null && Number.isFinite(Number(pack.pcsPerPacket))
            ? Math.max(1, Math.floor(Number(pack.pcsPerPacket)))
            : 100;

      const gallery = Array.isArray(p.images)
        ? p.images.filter((x): x is string => typeof x === "string")
        : [];
      const primary = typeof p.image === "string" && p.image.trim() ? p.image.trim() : "";
      const mergedGallery = [...gallery];
      if (primary && !mergedGallery.includes(primary)) mergedGallery.unshift(primary);

      setForm({
        sku: p.sku ?? "",
        name: p.name,
        productKind: p.productKind,
        slug: p.slug ?? "",
        categoryId: p.category?._id ?? "",
        description: p.description ?? "",
        brand: p.brand ?? "",
        basicPrice: String(p.pricing?.basicPrice ?? ""),
        priceWithGst: String(p.pricing?.priceWithGst ?? ""),
        currency: p.pricing?.currency ?? "INR",
        isActive: p.isActive,
        isNew: Boolean(p.isNew),
        isIsiCertified: Boolean(p.isIsiCertified),
        sizeLabel,
        bulkUnits: [loadBulkFromProduct(p)[0] ?? "per_bag"],
        innerUnits: [loadInnerFromProduct(p)[0] ?? "per_packet"],
        moq: p.moq != null && Number.isFinite(p.moq) && p.moq > 0 ? String(Math.floor(p.moq)) : "",
        moqBags:
          p.moqBags != null && Number.isFinite(p.moqBags) && p.moqBags > 0
            ? String(Math.floor(p.moqBags))
            : "",
        pcsPerPacket: String(pcsResolved),
        packetsPerBag: packetsPerBagResolved > 0 ? String(packetsPerBagResolved) : "",
        imagesJson: mergedGallery.length ? JSON.stringify(mergedGallery, null, 2) : "[]",
        keyFeatureRows: loadKeyFeatureRowsFromProduct(p),
        sortOrder: typeof p.sortOrder === "number" ? p.sortOrder : 0,
      });
      setSortConflict(null);
      setSortOrderCheckOk(false);
      setEditBaselineSortOrder(typeof p.sortOrder === "number" ? p.sortOrder : 0);
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load product");
    }
  }

  async function checkSortOrder() {
    setSortChecking(true);
    setError(null);
    setSortConflict(null);
    setSortOrderCheckOk(false);
    try {
      const sortOrder = sortOrderFromForm(form.sortOrder);
      const res = await fetch("/api/admin/products/check-sort-order", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sortOrder,
          ...(editingId ? { excludeProductId: editingId } : {}),
        }),
      });
      const json = (await res.json()) as {
        message?: string;
        available?: boolean;
        conflict?: { _id: string; name: string; sortOrder: number };
      };
      if (!res.ok) {
        throw new Error(json.message || res.statusText);
      }
      if (json.available) {
        setSortOrderCheckOk(true);
        return;
      }
      if (json.conflict) {
        setSortConflict(json.conflict);
        return;
      }
      throw new Error("Unexpected response from sort order check.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sort order check failed");
    } finally {
      setSortChecking(false);
    }
  }

  async function saveProduct(swapSortOrderWith?: string) {
    setSaving(true);
    setError(null);
    if (!swapSortOrderWith) setSortConflict(null);
    try {
      const f = { ...emptyForm, ...form };
      const basicPrice = Number(f.basicPrice);
      const priceWithGst = Number(f.priceWithGst);
      if (Number.isNaN(basicPrice) || Number.isNaN(priceWithGst)) {
        throw new Error("Pricing must be valid numbers");
      }
      const pcsPerPacketNum = Math.max(1, Math.floor(Number(f.pcsPerPacket) || 1));
      const packetsPerBagRaw = String(f.packetsPerBag ?? "").trim();
      const packetsPerBagNum =
        packetsPerBagRaw === "" ? 0 : Math.max(0, Math.floor(Number(packetsPerBagRaw)));

      const packingDefinesMoq =
        f.productKind === "catalog" && pcsPerPacketNum >= 1 && packetsPerBagNum > 0;

      const catalog = buildSizesAndSellers(
        f.productKind,
        f.sizeLabel,
        basicPrice,
        priceWithGst,
        pcsPerPacketNum,
        packetsPerBagNum,
      );
      let imagesList: string[];
      try {
        const raw = String(f.imagesJson ?? "").trim() || "[]";
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) throw new Error("Gallery images must be a JSON array");
        imagesList = parsed.filter((x): x is string => typeof x === "string");
      } catch (e) {
        throw e instanceof SyntaxError ? new Error("Invalid JSON in gallery images") : e;
      }

      const sizeOrModelTrim = String(f.sizeLabel ?? "").trim();
      const bulkUnits = normalizeBulkUnitsForSave(f.bulkUnits);
      const innerUnits = normalizeInnerUnitsForSave(f.innerUnits);
      const pricingUnit = primaryPricingUnit(innerUnits, bulkUnits);
      const primaryImage = imagesList[0]?.trim() || undefined;

      let moq: number | undefined;
      let moqBags: number | undefined;
      if (packingDefinesMoq) {
        moq = undefined;
        moqBags = undefined;
      } else {
        const moqRaw = String(f.moq ?? "").trim();
        const moqParsed = moqRaw === "" ? NaN : Number(moqRaw);
        moq = Number.isFinite(moqParsed) && moqParsed > 0 ? Math.floor(moqParsed) : undefined;
        const moqBagsRaw = String(f.moqBags ?? "").trim();
        const moqBagsParsed = moqBagsRaw === "" ? NaN : Number(moqBagsRaw);
        moqBags =
          Number.isFinite(moqBagsParsed) && moqBagsParsed > 0 ? Math.floor(moqBagsParsed) : undefined;
      }

      const minOrder = buildMinOrderLine(moq, moqBags, packetsPerBagNum, bulkUnits, innerUnits);

      const keyRows = f.keyFeatureRows
        .map((r) => ({
          text: String(r.text ?? "").trim(),
          icon: normalizeKeyFeatureIcon(r.icon),
        }))
        .filter((r) => r.text.length > 0);

      const packaging = {
        pricingUnit,
        bulkUnitChoices: bulkUnits,
        innerUnitChoices: innerUnits,
        pcsPerPacket: pcsPerPacketNum,
        ...(packetsPerBagNum > 0
          ? { packetsInMasterBag: packetsPerBagNum, pktInMasterBag: packetsPerBagNum }
          : {}),
      };

      if (editingId) {
        const body: Record<string, unknown> = {
          sku: String(f.sku ?? "").trim().toUpperCase(),
          name: String(f.name ?? "").trim(),
          productKind: f.productKind,
          slug: String(f.slug ?? "").trim().toLowerCase() || undefined,
          category: f.categoryId,
          sortOrder: sortOrderFromForm(f.sortOrder),
          description: String(f.description ?? "").trim() || undefined,
          brand: String(f.brand ?? "").trim(),
          image: primaryImage,
          isActive: f.isActive,
          isNew: f.isNew,
          isIsiCertified: f.isIsiCertified,
          pricing: {
            basicPrice,
            priceWithGst,
            currency: String(f.currency ?? "").trim() || "INR",
          },
          sizeOrModel: sizeOrModelTrim,
          packaging,
          images: imagesList,
          moq: packingDefinesMoq ? null : moq ?? null,
          moqBags: packingDefinesMoq ? null : moqBags ?? null,
          minOrder: minOrder ?? "",
          ...(keyRows.length > 0
            ? { keyFeatures: keyRows, features: [] }
            : { keyFeatures: null, features: [] }),
        };
        if (swapSortOrderWith) {
          body.swapSortOrderWith = swapSortOrderWith;
        }
        if (f.productKind === "catalog" && catalog.sizes) {
          body.sizes = catalog.sizes;
        } else {
          body.sizes = [];
        }
        body.sellers = [];

        const res = await fetch(`/api/admin/products/${editingId}`, {
          method: "PATCH",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as {
          message?: string;
          code?: string;
          conflict?: { _id: string; name: string; sortOrder: number };
        };
        if (!res.ok) {
          if (res.status === 409 && json.code === "SORT_ORDER_CONFLICT" && json.conflict) {
            setSortConflict(json.conflict);
            setSortOrderCheckOk(false);
            setError(
              `Sort order ${json.conflict.sortOrder} is already used by “${json.conflict.name}” in the product list. Use Check to verify, then Swap if you want to exchange positions.`,
            );
            return;
          }
          throw new Error(json.message || res.statusText);
        }
      } else {
        if (!f.categoryId) throw new Error("Category is required");
        const body: Record<string, unknown> = {
          name: String(f.name ?? "").trim(),
          productKind: f.productKind,
          slug: String(f.slug ?? "").trim().toLowerCase() || undefined,
          category: f.categoryId,
          sortOrder: sortOrderFromForm(f.sortOrder),
          description: String(f.description ?? "").trim() || undefined,
          brand: String(f.brand ?? "").trim() || undefined,
          image: primaryImage,
          isActive: f.isActive,
          isNew: f.isNew,
          isIsiCertified: f.isIsiCertified,
          pricing: {
            basicPrice,
            priceWithGst,
            currency: String(f.currency ?? "").trim() || "INR",
          },
          sizeOrModel: sizeOrModelTrim || undefined,
          packaging,
          images: imagesList,
          ...(packingDefinesMoq
            ? {}
            : {
                ...(moq !== undefined ? { moq } : {}),
                ...(moqBags !== undefined ? { moqBags } : {}),
              }),
          ...(minOrder ? { minOrder } : {}),
          ...(keyRows.length > 0
            ? { keyFeatures: keyRows, features: [] }
            : { keyFeatures: null, features: [] }),
        };
        if (f.productKind === "catalog" && catalog.sizes) {
          body.sizes = catalog.sizes;
        }
        body.sellers = [];
        const skuTrim = String(f.sku ?? "").trim().toUpperCase();
        if (skuTrim) body.sku = skuTrim;
        if (swapSortOrderWith) {
          body.swapSortOrderWith = swapSortOrderWith;
        }

        const res = await fetch("/api/admin/products", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as {
          message?: string;
          code?: string;
          conflict?: { _id: string; name: string; sortOrder: number };
        };
        if (!res.ok) {
          if (res.status === 409 && json.code === "SORT_ORDER_CONFLICT" && json.conflict) {
            setSortConflict(json.conflict);
            setSortOrderCheckOk(false);
            setError(
              `Sort order ${json.conflict.sortOrder} is already used by “${json.conflict.name}” in the product list. Use Check to verify, then Swap if you want to resolve the conflict.`,
            );
            return;
          }
          throw new Error(json.message || res.statusText);
        }
      }
      setSortConflict(null);
      setSortOrderCheckOk(false);
      setModalOpen(false);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void saveProduct();
  }

  async function handleSwapSortOrder() {
    if (!sortConflict) return;
    const targetOrder = sortOrderFromForm(form.sortOrder);
    let msg: string;
    if (editingId) {
      const from = editBaselineSortOrder ?? 0;
      msg = `Swap sort orders? This product will move from ${from} to ${targetOrder}, and “${sortConflict.name}” will move from ${targetOrder} to ${from}.`;
    } else {
      msg = `“${sortConflict.name}” already uses order ${sortConflict.sortOrder}. This will move that product to the end of the list so the new product can use ${sortConflict.sortOrder}. Continue?`;
    }
    if (!confirm(msg)) return;
    await saveProduct(sortConflict._id);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const canPrev = page > 0;
  const canNext = (page + 1) * pageSize < meta.total;

  useEffect(() => {
    if (!activeProductId) return;

    let frameId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pointerY: number | null = null;
    const PAGE_TURN_ZONE = 120;
    const PAGE_TURN_DELAY = 250;

    const schedulePageTurn = () => {
      if (timeoutId || pointerY === null) return;

      if (pointerY >= window.innerHeight - PAGE_TURN_ZONE && canNext) {
        timeoutId = setTimeout(() => {
          setPage((currentPage) => currentPage + 1);
          timeoutId = null;
          frameId = requestAnimationFrame(schedulePageTurn);
        }, PAGE_TURN_DELAY);
        return;
      }

      if (pointerY <= PAGE_TURN_ZONE && canPrev) {
        timeoutId = setTimeout(() => {
          setPage((currentPage) => Math.max(0, currentPage - 1));
          timeoutId = null;
          frameId = requestAnimationFrame(schedulePageTurn);
        }, PAGE_TURN_DELAY);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerY = event.clientY;
      schedulePageTurn();
    };

    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frameId) cancelAnimationFrame(frameId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeProductId, canNext, canPrev]);

  function handleDragStart(event: DragStartEvent) {
    setActiveProductId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveProductId(null);
    if (appliedSearchRef.current.trim()) {
      setError("Clear product search before drag reordering so the full product list can be renumbered safely.");
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = list.findIndex((p) => p._id === active.id);
    const newIndex = list.findIndex((p) => p._id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Move the items in local state
    const newList = arrayMove(list, oldIndex, newIndex);

    const finalSortOrders = newList.map((_: AdminProduct, index: number) => index + 1);

    // Create the updates mapping: id -> new sort order
    const updates = newList.map((p: AdminProduct, index: number) => ({
      id: p._id,
      sortOrder: finalSortOrders[index] ?? 0,
    }));

    // Optimistically update the list with new sort orders
    const newlyOrderedList = newList.map((p: AdminProduct, index: number) => ({
      ...p,
      sortOrder: finalSortOrders[index] ?? 0,
    }));
    setList(newlyOrderedList);

    try {
      const res = await fetch("/api/admin/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to save new order");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
      void loadProducts(); // Rollback on failure
    }
  }

  function handleDragCancel() {
    setActiveProductId(null);
  }

  return (
    <div>
      {error ? (
        <div className="admin-banner err" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-toolbar admin-toolbar-with-search">
        <div className="admin-toolbar-left">
          <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
            New product
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={() => void loadProducts()}
            disabled={loading}
          >
            Refresh
          </button>
          <span className="muted" style={{ fontSize: "0.875rem" }}>
            {meta.total} product(s) total
          </span>
        </div>
        <AdminProductSearchBar
          onRunSearch={(query, scrollToId) => void loadProducts(query, scrollToId)}
        />
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            >
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }} />
                    <th>S.No</th>
                    <th>Img</th>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Order</th>
                    <th>Kind</th>
                    <th>Price (GST)</th>
                    <th>Active</th>
                    <th />
                  </tr>
                </thead>
                <SortableContext items={pageSlice.map((p) => p._id)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {pageSlice.map((p, index) => (
                      <SortableProductRow
                        key={p._id}
                        product={p}
                        index={index}
                        skip={page * pageSize}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
              <DragOverlay>
                {activeProduct ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "56px minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "center",
                      minWidth: 320,
                      maxWidth: 520,
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(148, 163, 184, 0.4)",
                      background: "#ffffff",
                      boxShadow: "0 18px 38px rgba(15, 23, 42, 0.18)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--admin-muted, #64748b)",
                      }}
                    >
                      #{list.findIndex((product) => product._id === activeProduct._id) + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--admin-text, #0f172a)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {activeProduct.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--admin-muted, #64748b)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {activeProduct.sku || activeProduct.slug}
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          {list.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No products.</p> : null}
          <div className="admin-pagination">
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={!canPrev || loading}
              onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
            >
              Previous
            </button>
            <span>
              Showing {pageSlice.length ? page * pageSize + 1 : 0}–{page * pageSize + pageSlice.length} of {meta.total}
            </span>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={!canNext || loading}
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {modalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setModalOpen(false);
          }}
        >
          <div className="admin-modal wide" role="dialog" aria-labelledby="prod-modal-title">
            <h2 id="prod-modal-title">{editingId ? "Edit product" : "New product"}</h2>
            <form className="admin-modal-form" onSubmit={handleSubmit}>
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Product details</h3>
                <div className="admin-field-row">
                  <div className="admin-field">
                    <label htmlFor="p-sku">SKU (optional)</label>
                    <input
                      id="p-sku"
                      className="admin-input"
                      value={form.sku}
                      onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="p-kind">Product kind</label>
                    <select
                      id="p-kind"
                      className="admin-input admin-select"
                      value={form.productKind}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          productKind: e.target.value as "sku" | "catalog",
                        }))
                      }
                    >
                      <option value="catalog">Catalog</option>
                      <option value="sku">SKU line item</option>
                    </select>
                  </div>
                </div>
                <div className="admin-field">
                  <label htmlFor="p-name">Name</label>
                  <input
                    id="p-name"
                    className="admin-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="p-slug">Slug (URL; optional)</label>
                  <input
                    id="p-slug"
                    className="admin-input"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="e.g. cable-nail-clips"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="p-cat">Category</label>
                  <select
                    id="p-cat"
                    className="admin-input admin-select"
                    value={form.categoryId}
                    onChange={(e) => {
                      setSortConflict(null);
                      setSortOrderCheckOk(false);
                      setForm((f) => ({ ...f, categoryId: e.target.value }));
                    }}
                    required={!editingId}
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label htmlFor="p-sort">Sort order</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      disabled={sortChecking || saving}
                      onClick={() => void checkSortOrder()}
                      title="Check MongoDB for another product using this order in the full product list"
                    >
                      {sortChecking ? "Checking…" : "Check"}
                    </button>
                    <input
                      id="p-sort"
                      type="number"
                      className="admin-input"
                      style={{ flex: "1 1 140px", minWidth: 120, maxWidth: 220 }}
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={form.sortOrder}
                      onChange={(e) => {
                        setSortConflict(null);
                        setSortOrderCheckOk(false);
                        const v = e.target.value;
                        setForm((f) => ({
                          ...f,
                          sortOrder: v === "" ? 0 : Number(v),
                        }));
                      }}
                    />
                  </div>
                  <p className="muted" style={{ marginTop: 6 }}>
                    Lower numbers appear first in ordering. Click Check to see if this number is free
                    in the full product list; if another product already uses it, you can Swap.
                  </p>
                  {sortOrderCheckOk ? (
                    <p className="admin-banner" role="status" style={{ marginTop: 8, marginBottom: 0 }}>
                      This sort order is available in the full product list. You can save the rest of
                      the form as usual.
                    </p>
                  ) : null}
                </div>
                {sortConflict ? (
                  <div className="admin-banner warn" role="status" style={{ marginBottom: 12 }}>
                    <p style={{ margin: "0 0 8px" }}>
                      {editingId
                        ? `Conflict: sort order ${sortConflict.sortOrder} is already used by “${sortConflict.name}”. Click Swap to exchange positions (this product takes ${sortConflict.sortOrder}, the other takes your previous order).`
                        : `Conflict: sort order ${sortConflict.sortOrder} is already used by “${sortConflict.name}”. Click Swap to move that product to the end of the list and use this order for the new product.`}
                    </p>
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={saving}
                      onClick={() => void handleSwapSortOrder()}
                    >
                      {editingId ? "Swap" : "Swap"}
                    </button>
                  </div>
                ) : null}
                <div className="admin-field">
                  <label htmlFor="p-brand">Brand</label>
                  <input
                    id="p-brand"
                    className="admin-input"
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Images &amp; description</h3>
                <MediaImageField
                  label="Image gallery (Cloudinary)"
                  kind="product"
                  productId={editingId ?? undefined}
                  value=""
                  showUrlInput={false}
                  trackMediaId={false}
                  onUrlChange={(url) =>
                    setForm((f) => {
                      let arr: string[] = [];
                      try {
                        const p = JSON.parse(String(f.imagesJson ?? "").trim() || "[]") as unknown;
                        if (Array.isArray(p)) arr = p.filter((x): x is string => typeof x === "string");
                      } catch {
                        arr = [];
                      }
                      return { ...f, imagesJson: JSON.stringify([...arr, url], null, 2) };
                    })
                  }
                  helpText="Upload images here. The first image is used as the main product photo on the storefront. Set CLOUDINARY_URL in .env.local. When editing, uploads are scoped under this product’s id."
                />
                <div className="admin-field">
                  <label htmlFor="p-desc">Description</label>
                  <textarea
                    id="p-desc"
                    className="admin-input"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    placeholder="Short product description"
                  />
                </div>

                <div className="admin-field" style={{ marginTop: "1rem" }}>
                  <span style={{ fontWeight: 600 }}>Key features (product page)</span>
                  <p className="muted" style={{ fontSize: "0.8rem", margin: "0.35rem 0 0.5rem" }}>
                    Optional. One row per bullet. Wrap text in **double asterisks** for bold. Use Enter for a new line
                    within the same bullet. Pick an icon per row.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {form.keyFeatureRows.map((row, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1fr) 11rem auto",
                          gap: "0.5rem",
                          alignItems: "start",
                        }}
                      >
                        <textarea
                          className="admin-input"
                          rows={2}
                          value={row.text}
                          placeholder='e.g. Material: **Grey Polypropylene**'
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((prev) => {
                              const next = [...prev.keyFeatureRows];
                              next[idx] = { ...next[idx], text: v };
                              return { ...prev, keyFeatureRows: next };
                            });
                          }}
                        />
                        <select
                          className="admin-input"
                          value={row.icon}
                          onChange={(e) => {
                            const v = e.target.value as KeyFeatureIcon;
                            setForm((prev) => {
                              const next = [...prev.keyFeatureRows];
                              next[idx] = { ...next[idx], icon: v };
                              return { ...prev, keyFeatureRows: next };
                            });
                          }}
                        >
                          {KEY_FEATURE_ICON_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost"
                          style={{ padding: "0.35rem 0.6rem" }}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              keyFeatureRows: prev.keyFeatureRows.filter((_, i) => i !== idx),
                            }));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    style={{ marginTop: "0.5rem" }}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        keyFeatureRows: [...prev.keyFeatureRows, { text: "", icon: "check" }],
                      }))
                    }
                  >
                    Add feature line
                  </button>
                </div>
              </div>

              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Base pricing</h3>
                <div className="admin-field-row">
                  <div className="admin-field">
                    <label htmlFor="p-basic">Basic price</label>
                    <input
                      id="p-basic"
                      className="admin-input"
                      type="number"
                      step="any"
                      value={form.basicPrice}
                      onChange={(e) => setForm((f) => ({ ...f, basicPrice: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="p-gst">Price with GST</label>
                    <input
                      id="p-gst"
                      className="admin-input"
                      type="number"
                      step="any"
                      value={form.priceWithGst}
                      onChange={(e) => setForm((f) => ({ ...f, priceWithGst: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="admin-field" style={{ maxWidth: "8rem" }}>
                    <label htmlFor="p-cur">Currency</label>
                    <input
                      id="p-cur"
                      className="admin-input"
                      value={form.currency}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Size &amp; quantity units</h3>
                <p className="muted" style={{ fontSize: "0.875rem", marginTop: 0 }}>
                  One <strong>size</strong> per product. Pick a preset or <strong>Add new</strong> and type your unit
                  (e.g. bundle). Primary cart unit: packet or box first, then bags or carton; custom labels use
                  &quot;other&quot; pricing mode.
                </p>
                <div className="admin-field">
                  <label htmlFor="p-size">Size / model</label>
                  <input
                    id="p-size"
                    className="admin-input"
                    value={form.sizeLabel}
                    onChange={(e) => setForm((f) => ({ ...f, sizeLabel: e.target.value }))}
                    placeholder="e.g. 5 MM"
                    autoComplete="off"
                  />
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Bags / carton</p>
                  <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 0.5rem" }}>
                    Outer or bulk units — choose Bags, Carton, or <strong>Add new</strong> and type a label.
                  </p>
                  {(() => {
                    const u = form.bulkUnits[0] ?? "per_bag";
                    const isCustom = u.startsWith("custom:");
                    const selectVal = isCustom ? UNIT_ADD_NEW : u;
                    const customText = isCustom ? u.slice(7) : "";
                    return (
                      <div
                        className="admin-field-row"
                        style={{
                          alignItems: "flex-end",
                          marginBottom: "0.5rem",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div className="admin-field" style={{ flex: 1, minWidth: "9rem" }}>
                          <label className="admin-sr-only" htmlFor="p-bulk-0">
                            Bags, carton, or add new
                          </label>
                          <select
                            id="p-bulk-0"
                            className="admin-input admin-select"
                            value={selectVal}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((f) => ({
                                ...f,
                                bulkUnits: [v === UNIT_ADD_NEW ? "custom:" : v],
                              }));
                            }}
                          >
                            {BULK_UNIT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                            <option value={UNIT_ADD_NEW}>Add new</option>
                          </select>
                        </div>
                        {(isCustom || selectVal === UNIT_ADD_NEW) && (
                          <div className="admin-field" style={{ flex: 1, minWidth: "10rem" }}>
                            <label className="admin-sr-only" htmlFor="p-bulk-custom-0">
                              New bulk unit label
                            </label>
                            <input
                              id="p-bulk-custom-0"
                              className="admin-input"
                              value={customText}
                              placeholder="e.g. bundle"
                              autoComplete="off"
                              onChange={(e) => {
                                const t = e.target.value;
                                setForm((f) => ({
                                  ...f,
                                  bulkUnits: [t.trim() ? `custom:${t}` : "custom:"],
                                }));
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div style={{ marginTop: "1.25rem" }}>
                  <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Packets / box</p>
                  <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 0.5rem" }}>
                    Inner sell units — Packets, Box, or <strong>Add new</strong> with your label.
                  </p>
                  {(() => {
                    const u = form.innerUnits[0] ?? "per_packet";
                    const isCustom = u.startsWith("custom:");
                    const selectVal = isCustom ? UNIT_ADD_NEW : u;
                    const customText = isCustom ? u.slice(7) : "";
                    return (
                      <div
                        className="admin-field-row"
                        style={{
                          alignItems: "flex-end",
                          marginBottom: "0.5rem",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div className="admin-field" style={{ flex: 1, minWidth: "9rem" }}>
                          <label className="admin-sr-only" htmlFor="p-inner-0">
                            Packet, box, or add new
                          </label>
                          <select
                            id="p-inner-0"
                            className="admin-input admin-select"
                            value={selectVal}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((f) => ({
                                ...f,
                                innerUnits: [v === UNIT_ADD_NEW ? "custom:" : v],
                              }));
                            }}
                          >
                            {INNER_UNIT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                            <option value={UNIT_ADD_NEW}>Add new</option>
                          </select>
                        </div>
                        {(isCustom || selectVal === UNIT_ADD_NEW) && (
                          <div className="admin-field" style={{ flex: 1, minWidth: "10rem" }}>
                            <label className="admin-sr-only" htmlFor="p-inner-custom-0">
                              New inner unit label
                            </label>
                            <input
                              id="p-inner-custom-0"
                              className="admin-input"
                              value={customText}
                              placeholder="e.g. bundle"
                              autoComplete="off"
                              onChange={(e) => {
                                const t = e.target.value;
                                setForm((f) => ({
                                  ...f,
                                  innerUnits: [t.trim() ? `custom:${t}` : "custom:"],
                                }));
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="admin-field-row" style={{ marginTop: "1.25rem", alignItems: "flex-end" }}>
                  <div className="admin-field">
                    <label htmlFor="p-pcs-per-pkt">PCS per packet</label>
                    <input
                      id="p-pcs-per-pkt"
                      className="admin-input"
                      type="number"
                      min={1}
                      step={1}
                      value={form.pcsPerPacket ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, pcsPerPacket: e.target.value }))}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="p-pkt-per-bag">Packets per master bag</label>
                    <input
                      id="p-pkt-per-bag"
                      className="admin-input"
                      type="number"
                      min={0}
                      step={1}
                      value={form.packetsPerBag ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, packetsPerBag: e.target.value }))}
                      placeholder="e.g. 750 — empty = packet-only"
                    />
                  </div>
                </div>
                <p className="muted" style={{ fontSize: "0.8rem", margin: "0.25rem 0 0" }}>
                  Drives storefront <strong>PACKING DETAILS</strong> (pcs/packet and pkts/master bag) and the bag
                  quantity stepper. Leave &quot;packets per master bag&quot; empty if you only sell by packet.
                  {packingReplacesMoq ? (
                    <>
                      {" "}
                      With <strong>both</strong> values set, separate MOQ fields are hidden — packing defines sellable
                      units (customers order in packets and/or master bags; no extra minimum quantity fields).
                    </>
                  ) : null}
                </p>

                {!packingReplacesMoq ? (
                  <>
                    <div className="admin-field-row" style={{ marginTop: "1rem", alignItems: "flex-end" }}>
                      <div className="admin-field">
                        <label htmlFor="p-moq">MOQ (packets)</label>
                        <input
                          id="p-moq"
                          name="moq"
                          className="admin-input"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={form.moq ?? ""}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            setForm((f) => ({ ...f, moq: digits }));
                          }}
                          placeholder="e.g. 65"
                        />
                      </div>
                      <div className="admin-field">
                        <label htmlFor="p-moq-bags">MOQ (bags)</label>
                        <input
                          id="p-moq-bags"
                          name="moqBags"
                          className="admin-input"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={form.moqBags ?? ""}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            setForm((f) => ({ ...f, moqBags: digits }));
                          }}
                          placeholder="e.g. 2"
                        />
                      </div>
                    </div>
                    <p className="muted" style={{ fontSize: "0.8rem", margin: "0.35rem 0 0" }}>
                      Shown only when <strong>packets per master bag</strong> is empty or packet-only. When you add
                      both packing numbers above, MOQ is not used — packing replaces it.
                    </p>
                  </>
                ) : null}
              </div>

              <div className="admin-form-section admin-form-section-inline">
                <label className="admin-check admin-check-pill">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active on storefront
                </label>
                <label className="admin-check admin-check-pill">
                  <input
                    type="checkbox"
                    checked={form.isNew}
                    onChange={(e) => setForm((f) => ({ ...f, isNew: e.target.checked }))}
                  />
                  Mark as new
                </label>
                <label className="admin-check admin-check-pill">
                  <input
                    type="checkbox"
                    checked={form.isIsiCertified}
                    onChange={(e) => setForm((f) => ({ ...f, isIsiCertified: e.target.checked }))}
                  />
                  Show “ISI Certified” on product page
                </label>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
