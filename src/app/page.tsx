"use client";
import dynamic from "next/dynamic";

// Leaflet needs the browser, so the map is loaded client-side only.
const KindnessMap = dynamic(() => import("./_components/kindness-map"), { ssr: false });

export default function Home() {
  return <KindnessMap />;
}
