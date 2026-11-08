"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";

maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
import { useEffect, useRef } from "react";

export type MapPin = { id: string; name: string; lat: number; lng: number };
export type MapRoute = { id: string; from: [number, number]; to: [number, number] };

// OpenFreeMap needs no key. The light style is recoloured below to the brand's dark greens.
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const ROUTE_SOURCE = "pending-routes";

function darken(map: MapLibreMap): void {
  for (const layer of map.getStyle().layers) {
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#0b2a1d");
      else if (layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", /water/i.test(layer.id) ? "#06202c" : "#12382a");
      else if (layer.type === "line") map.setPaintProperty(layer.id, "line-color", "#1f5e45");
      else if (layer.type === "symbol") {
        map.setPaintProperty(layer.id, "text-color", "#a8cdb9");
        map.setPaintProperty(layer.id, "text-halo-color", "#042e1c");
      }
    } catch {
      // A layer without that property is left as it is.
    }
  }
}

/** Dark map of the vendor's places and pending routes. Pins are real buttons, so they work by keyboard. */
export default function DashboardMap({
  pins,
  routes,
  activePinId,
  onSelect,
}: {
  pins: MapPin[];
  routes: MapRoute[];
  activePinId: string | null;
  onSelect: (id: string | null) => void;
}): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Map<string, { marker: Marker; el: HTMLButtonElement }>>(new Map());
  const select = useRef(onSelect);
  const latestRoutes = useRef(routes);

  useEffect(() => {
    select.current = onSelect;
    latestRoutes.current = routes;
  });

  // Create the map once; markers come and go with the pins.
  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: [-77.3, 18.15],
      zoom: 7,
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      darken(map);
      map.addSource(ROUTE_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: ROUTE_SOURCE, type: "line", source: ROUTE_SOURCE, paint: { "line-color": "#FAC422", "line-width": 2.5, "line-dasharray": [2, 2] } });
      const source = map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource;
      source.setData({
        type: "FeatureCollection",
        features: latestRoutes.current.map((r) => ({
          type: "Feature",
          properties: { id: r.id },
          geometry: { type: "LineString", coordinates: [r.from, r.to] },
        })),
      });
    });
    const pinMarkers = markers.current;
    return () => {
      pinMarkers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const store = markers.current;
    for (const { marker } of store.values()) marker.remove();
    store.clear();
    for (const pin of pins) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "size-4 rounded-full border-2 border-white bg-brand shadow";
      el.setAttribute("aria-label", pin.name);
      el.addEventListener("click", () => select.current(pin.id));
      const marker = new maplibregl.Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(map);
      store.set(pin.id, { marker, el });
    }
    if (pins.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      for (const pin of pins) bounds.extend([pin.lng, pin.lat]);
      map.fitBounds(bounds, { padding: 40, maxZoom: 9, duration: 0 });
    }
  }, [pins]);

  useEffect(() => {
    for (const [id, { el }] of markers.current) {
      const active = id === activePinId;
      el.setAttribute(
        "class",
        active
          ? "size-6 rounded-full border-2 border-white bg-secondary shadow-lg"
          : "size-4 rounded-full border-2 border-white bg-brand shadow",
      );
      el.setAttribute("aria-pressed", String(active));
    }
  }, [activePinId, pins]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: routes.map((r) => ({
        type: "Feature",
        properties: { id: r.id },
        geometry: { type: "LineString", coordinates: [r.from, r.to] },
      })),
    });
  }, [routes]);

  return <div ref={container} className="size-full" role="region" aria-label="Map of the places you serve" />;
}
