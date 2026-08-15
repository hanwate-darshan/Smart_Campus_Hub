"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic import for Leaflet map to disable SSR
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
// MapController removed

export default function LiveMap({ studentLocation, guardLocation }) {
  const [L, setL] = useState(null);
  const [map, setMap] = useState(null);

  // Fallback to campus coordinates (Pune Campus) if [0,0] or invalid GPS coordinates are received
  const rawSLat = studentLocation ? studentLocation[1] : 0;
  const rawSLng = studentLocation ? studentLocation[0] : 0;
  const sLat = (rawSLat !== 0 || rawSLng !== 0) ? rawSLat : 18.5204;
  const sLng = (rawSLat !== 0 || rawSLng !== 0) ? rawSLng : 73.8567;
  const isStudentValid = true;

  const rawGLat = guardLocation ? guardLocation[1] : 0;
  const rawGLng = guardLocation ? guardLocation[0] : 0;
  const hasGuard = guardLocation && (rawGLat !== 0 || rawGLng !== 0);
  const gLat = hasGuard ? rawGLat : 18.5215;
  const gLng = hasGuard ? rawGLng : 73.8580;

  useEffect(() => {
    if (!map || !L) return;

    if (hasGuard) {
      const isSameLocation = Math.abs(sLat - gLat) < 0.0001 && Math.abs(sLng - gLng) < 0.0001;
      
      if (isSameLocation) {
        map.setView([sLat, sLng], 17);
      } else {
        const bounds = L.latLngBounds([sLat, sLng], [gLat, gLng]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
      }
    } else {
      map.setView([sLat, sLng], 17);
    }
  }, [map, sLat, sLng, gLat, gLng, hasGuard, L]);

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

  if (!L) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
        Loading interactive map...
      </div>
    );
  }

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

  // Calculate center to show both pins
  const centerLat = (sLat + gLat) / 2;
  const centerLng = (sLng + gLng) / 2;

  return (
    <div style={{ height: "100%", width: "100%", zIndex: 1 }}>
      <MapContainer
        ref={setMap}
        center={[centerLat, centerLng]}
        zoom={guardLocation ? 16 : 17}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={[sLat, sLng]} icon={studentIcon}>
          <Popup>Student Emergency Location</Popup>
        </Marker>

        <Marker position={[gLat, gLng]} icon={guardIcon}>
          <Popup>Security Responder Location</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
