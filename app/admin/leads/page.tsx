import { connectDb } from "@/lib/db/connect";
import { LeadModel } from "@/lib/db/models/Lead";
import type { LeadStatus } from "@/lib/db/models/Lead";
import { formatAdminDateTime } from "@/lib/utils/formatAdminDateTime";
import AdminLeadsTable, { type AdminLeadCartLine, type AdminLeadsTableRow } from "../components/AdminLeadsTable";

function toRowStatus(s: unknown): LeadStatus {
  return s === "ordered" ? "ordered" : "non-ordered";
}

function parseCartLines(raw: unknown): AdminLeadCartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
    const productName = typeof o.productName === "string" && o.productName.trim() ? o.productName : "—";
    const size = typeof o.size === "string" && o.size.trim() ? o.size : "—";
    let quantityLabel: string;
    if (typeof o.quantity === "number" && Number.isFinite(o.quantity)) {
      quantityLabel = String(o.quantity);
    } else if (typeof o.quantity === "string" && o.quantity.trim()) {
      quantityLabel = o.quantity;
    } else {
      quantityLabel = "—";
    }
    return { productName, size, quantityLabel };
  });
}

export default async function AdminLeadsPage() {
  await connectDb();
  const leads = await LeadModel.find({})
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean()
    .exec();

  const rows: AdminLeadsTableRow[] = leads.map((l) => {
    const id = String(l._id);
    const created = l.createdAt instanceof Date ? l.createdAt : new Date();
    return {
      id,
      phone: typeof l.phone === "string" ? l.phone : "—",
      dateLabel: formatAdminDateTime(created),
      status: toRowStatus(l.status),
      cartLines: parseCartLines(l.itemsInCart),
    };
  });

  return (
    <div className="admin-root">
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 className="admin-dashboard-title" style={{ margin: 0 }}>
          Leads
        </h1>
        <p className="admin-dashboard-lead" style={{ margin: "0.5rem 0 0" }}>
          Everyone who entered a phone number ({rows.length} records). Search updates as you type. Click a row for full
          details.
        </p>
      </header>

      <AdminLeadsTable rows={rows} />
    </div>
  );
}
