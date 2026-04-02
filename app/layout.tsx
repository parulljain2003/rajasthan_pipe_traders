import "./globals.css";
import Header from "./components/Header/Header";
import { CartWishlistProvider } from "./context/CartWishlistContext";

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
