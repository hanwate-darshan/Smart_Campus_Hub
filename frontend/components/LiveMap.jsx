"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic import for Leaflet map to disable SSR
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export default function LiveMap({ studentLocation, guardLocation }) {
  const [L, setL] = useState(null);

  useEffect(() => {
    // Dynamically load Leaflet for icon configuration
    import("leaflet").then((leaflet) => {
      // Fix default icon issue with Webpack
      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
      setL(leaflet);
    });
  }, []);

  if (!L || !studentLocation) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
        Loading interactive map...
      </div>
    );
  }

  const studentLat = studentLocation[1];
  const studentLng = studentLocation[0];

  const studentIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const guardIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Calculate center to show both pins if possible
  const centerLat = guardLocation ? (studentLat + guardLocation[1]) / 2 : studentLat;
  const centerLng = guardLocation ? (studentLng + guardLocation[0]) / 2 : studentLng;

  return (
    <div style={{ height: "100%", width: "100%", zIndex: 1 }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={guardLocation ? 16 : 17}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={[studentLat, studentLng]} icon={studentIcon}>
          <Popup>Student Location</Popup>
        </Marker>

        {guardLocation && (
          <Marker position={[guardLocation[1], guardLocation[0]]} icon={guardIcon}>
            <Popup>Security Responder</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
