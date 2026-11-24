import "~/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Pinboard: Neighborhood Kindness Board",
  description: "One kind act at a time, on one shared map.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><TRPCReactProvider>{children}</TRPCReactProvider></body>
    </html>
  );
}
