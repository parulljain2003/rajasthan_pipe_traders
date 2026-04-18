import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "./components/Header/Header";
import { CartWishlistProvider } from "./context/CartWishlistContext";

export const metadata: Metadata = {
  title: {
    default: "Rajasthan Pipe Traders",
    template: "%s | Rajasthan Pipe Traders",
  },
  description:
    "Electrical, plumbing, and hardware supplies — quality products for trade and retail.",
};

/** Required for real device widths on iPhone/Android; without this, mobile Safari uses a ~980px layout. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartWishlistProvider>
          <Header />
          <main>
            {children}
          </main>
        </CartWishlistProvider>
      </body>
    </html>
  );
}
