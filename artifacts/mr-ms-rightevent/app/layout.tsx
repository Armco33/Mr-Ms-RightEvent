import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mr-Ms-RightEvent · Co-Parrot",
  description: "Find your next good night out in Taipei with Co-Parrot.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}