"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";

maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
import { useEffect, useRef } from "react";

// OpenFreeMap needs no key.
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const JAMAICA: [number, number] = [-77.3, 18.15];
const round = (value: number): number => Math.round(value * 1e6) / 1e6;

/**
 * Click the map or drag the pin to set the venue's exact spot. The latitude and longitude fields
 * beside it do the same by keyboard, so the map is never the only way in.
 */
export default function PinPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
}): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const change = useRef(onChange);
  const start = useRef({ latitude, longitude });

  useEffect(() => {
    change.current = onChange;
  });

  // The map is created once; the pin follows the fields.
  useEffect(() => {
    if (!container.current) return;
    const { latitude: lat, longitude: lng } = start.current;
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: lat !== null && lng !== null ? [lng, lat] : JAMAICA,
      zoom: lat !== null && lng !== null ? 14 : 7,
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (event) => change.current(round(event.lngLat.lat), round(event.lngLat.lng)));
    return () => {
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || latitude === null || longitude === null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const marker = new maplibregl.Marker({ color: "#0A7A49", draggable: true }).setLngLat([longitude, latitude]).addTo(map);
      marker.on("dragend", () => {
        const at = marker.getLngLat();
        change.current(round(at.lat), round(at.lng));
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }
    map.easeTo({ center: [longitude, latitude], duration: 200 });
  }, [latitude, longitude]);

  return <div ref={container} className="h-72 w-full overflow-hidden rounded-2xl border border-border" role="region" aria-label="Map: click to place the venue pin" />;
}
