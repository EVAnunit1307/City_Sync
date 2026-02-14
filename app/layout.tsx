import type { Metadata } from "next";
import { Archivo, Lora, Playfair_Display, Instrument_Serif } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-archivo",
});

const lora = Lora({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-lora",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: "GrowthSync — Subdivision Impact Simulator",
  description: "Real-time subdivision impact simulator. Test housing proposals, simulate traffic congestion, transit load, and infrastructure strain in a 3D digital twin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${lora.variable} ${playfair.variable} ${instrumentSerif.variable} antialiased`}
      >
        {children}
        <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" async></script>
      </body>
    </html>
  );
}
