import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoSaarthi AI — Geospatial Outdoor Activity & Environmental Assistant",
  description: "Personalized GeoAI Outdoor Activity Recommendation Assistant for Mumbai. Powered by Open-Meteo, OpenStreetMap, OSRM, and local Qwen 3.5 9B.",
  keywords: ["GeoAI", "Mumbai", "Outdoor Activity", "OpenStreetMap", "Qwen 3.5", "Weather", "Air Quality", "Routes"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
