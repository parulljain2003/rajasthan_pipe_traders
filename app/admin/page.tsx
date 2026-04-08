import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div>
      <p style={{ color: "#4b5563", marginBottom: "1rem", maxWidth: "42rem" }}>
        Manage categories and products in MongoDB. Responses follow the shapes described in{" "}
        <code style={{ fontSize: "0.85em" }}>docs/FRONTEND_API_INTEGRATION.md</code>. Set{" "}
        <code style={{ fontSize: "0.85em" }}>MONGODB_URI</code> in{" "}
        <code style={{ fontSize: "0.85em" }}>.env.local</code> so the admin API can connect.
      </p>
      <ul style={{ lineHeight: 1.8 }}>
        <li>
          <Link href="/admin/categories">Categories — list, create, edit, delete</Link>
        </li>
        <li>
          <Link href="/admin/products">Products — list, create, edit, delete</Link>
        </li>
        <li>
          <Link href="/admin/media">Media — list & delete Cloudinary uploads</Link>
        </li>
      </ul>
    </div>
  );
}
