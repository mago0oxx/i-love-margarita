import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "I love Margarita · La Perla del Caribe",
    template: "%s · I love Margarita",
  },
  description:
    "Diseño, recuerdos y un pedacito del Caribe. Descubre las colecciones de I love Margarita.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
