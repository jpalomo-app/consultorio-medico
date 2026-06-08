import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TurnyButton from "@/components/ui/TurnyButton";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SM Medicina Laboral — Turnos Online",
  description: "Reservá tu turno médico en SM Medicina Laboral de forma rápida y sencilla.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23B91C1C'/><text y='.9em' font-size='70' font-weight='900' fill='white' font-family='Arial' x='8'>SM</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans bg-white antialiased">
        {children}
        <TurnyButton />
      </body>
    </html>
  );
}
