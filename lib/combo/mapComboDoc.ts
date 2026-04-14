import type { ComboRuleLean } from "@/lib/combo/resolveCartComboPricing";

type LeanCombo = {
  _id: { toString: () => string };
  name: string;
  priority: number;
  beneficiaryProductId: unknown;
  beneficiaryDiscountType?: string;
  beneficiaryDiscountValue?: number;
  requirements: Array<{
    productId: unknown;
    thresholdKind: "bag" | "carton";
    minOuterUnits: number;
  }>;
};

function idStr(ref: unknown): string {
  if (ref && typeof ref === "object" && "_id" in ref) {
    return String((ref as { _id: { toString: () => string } })._id);
  }
  return String(ref);
}

export function comboDocToRule(doc: LeanCombo): ComboRuleLean {
  const dt = doc.beneficiaryDiscountType === "flat" ? "flat" : "percentage";
  const dv =
    typeof doc.beneficiaryDiscountValue === "number" && Number.isFinite(doc.beneficiaryDiscountValue)
      ? doc.beneficiaryDiscountValue
      : 0;
  return {
    _id: doc._id.toString(),
    name: doc.name,
    priority: typeof doc.priority === "number" ? doc.priority : 100,
    beneficiaryProductId: idStr(doc.beneficiaryProductId),
    beneficiaryDiscountType: dt,
    beneficiaryDiscountValue: dv,
    requirements: (doc.requirements ?? []).map((r) => ({
      productId: idStr(r.productId),
      thresholdKind: r.thresholdKind,
      minOuterUnits: r.minOuterUnits,
    })),
  };
}
