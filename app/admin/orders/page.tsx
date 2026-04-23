import { connectDb } from "@/lib/db/connect";
import { OrderModel } from "@/lib/db/models/Order";
import { orderSerialFromMongoId } from "@/lib/utils/orderSerialFromId";
import { formatAdminDateTime } from "@/lib/utils/formatAdminDateTime";
import type { QuotationPdfOrderData } from "@/lib/utils/generateQuotationPDF";
import AdminOrdersTable, { type AdminOrdersTableRow } from "../components/AdminOrdersTable";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    n
  );
}

function toPdfPayload(
  o: {
    _id: unknown;
    createdAt?: Date;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    totalPrice?: number;
    orderSummary?: unknown;
    cartItems?: unknown;
  },
  id: string
): QuotationPdfOrderData {
  const cAt = o.createdAt instanceof Date ? o.createdAt : new Date();
  const orderSummary =
    o.orderSummary && typeof o.orderSummary === "object" && !Array.isArray(o.orderSummary)
      ? (o.orderSummary as QuotationPdfOrderData["orderSummary"])
      : {};
  const cartItems = Array.isArray(o.cartItems) ? o.cartItems : [];
  return {
    id,
    serialNo: orderSerialFromMongoId(id),
    createdAt: cAt.toISOString(),
    customerName: typeof o.customerName === "string" ? o.customerName : "",
    customerPhone: typeof o.customerPhone === "string" ? o.customerPhone : "",
    customerEmail: typeof o.customerEmail === "string" ? o.customerEmail : "",
    totalPrice: typeof o.totalPrice === "number" && Number.isFinite(o.totalPrice) ? o.totalPrice : 0,
    orderSummary,
    cartItems: cartItems as QuotationPdfOrderData["cartItems"],
  };
}

export default async function AdminOrdersPage() {
  await connectDb();
  const orders = await OrderModel.find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .lean()
    .exec();

  const rows: AdminOrdersTableRow[] = orders.map((o) => {
    const id = String(o._id);
    const created = o.createdAt instanceof Date ? o.createdAt : new Date();
    const total = typeof o.totalPrice === "number" && Number.isFinite(o.totalPrice) ? o.totalPrice : 0;
    const name = typeof o.customerName === "string" && o.customerName.trim() ? o.customerName : "—";
    return {
      orderId: orderSerialFromMongoId(id),
      dateLabel: formatAdminDateTime(created),
      customerName: name,
      phone: typeof o.customerPhone === "string" ? o.customerPhone : "—",
      totalLabel: formatInr(total),
      pdfPayload: toPdfPayload(o, id),
    };
  });

  return (
    <div className="admin-root">
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 className="admin-dashboard-title" style={{ margin: 0 }}>
          Orders
        </h1>
        <p className="admin-dashboard-lead" style={{ margin: "0.5rem 0 0" }}>
          All quotation and checkout records ({rows.length} shown, newest first). Use View PDF to download the same invoice
          as at checkout.
        </p>
      </header>

      <AdminOrdersTable rows={rows} />
    </div>
  );
}
