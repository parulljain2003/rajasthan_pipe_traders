import Link from "next/link";
import "./admin.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      <nav className="admin-nav" aria-label="Admin">
        <span className="admin-title">Admin</span>
        <Link href="/admin">Overview</Link>
        <Link href="/admin/categories">Categories</Link>
        <Link href="/admin/products">Products</Link>
        <Link href="/admin/coupons">Coupons</Link>
        <Link href="/admin/media">Media (Cloudinary)</Link>
        <Link href="/admin/settings">Settings</Link>
        <Link href="/">← Storefront</Link>
      </nav>
      {children}
    </div>
  );
}
