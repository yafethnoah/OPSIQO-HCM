'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';

export interface TimeLocationMapPoint {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  subtitle?: string;
  status?: string;
  accuracyMeters?: number;
  capturedAt?: string;
  isSelf?: boolean;
}

export function TimeLocationMap({
  points,
  ariaLabel,
  emptyMessage,
}: {
  points: TimeLocationMapPoint[];
  ariaLabel: string;
  emptyMessage: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | null = null;

    if (!containerRef.current || points.length === 0) {
      setMapError('');
      return;
    }

    const renderMap = async () => {
      try {
        const L = await import('leaflet');

        if (disposed || !containerRef.current) return;

        map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: true,
        });

        L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors',
          },
        ).addTo(map);

        const bounds = L.latLngBounds([]);

        for (const point of points) {
          const coordinate = L.latLng(
            point.latitude,
            point.longitude,
          );

          bounds.extend(coordinate);

          const fillColor =
            point.isSelf || point.status === 'clocked_in'
              ? '#1ABCBC'
              : point.status === 'on_break'
                ? '#F59E0B'
                : '#64748B';

          const marker = L.circleMarker(coordinate, {
            radius: point.isSelf ? 10 : 8,
            color: '#1F3A5F',
            weight: 2,
            fillColor,
            fillOpacity: 0.9,
          }).addTo(map);

          const popup = document.createElement('div');

          const title = document.createElement('strong');
          title.textContent = point.label;
          popup.appendChild(title);

          if (point.subtitle) {
            const subtitle = document.createElement('div');
            subtitle.textContent = point.subtitle;
            popup.appendChild(subtitle);
          }

          if (point.capturedAt) {
            const captured = document.createElement('small');
            captured.textContent = `Captured ${new Date(
              point.capturedAt,
            ).toLocaleString()}`;
            popup.appendChild(captured);
          }

          marker.bindPopup(popup);

          if (
            point.accuracyMeters !== undefined &&
            point.accuracyMeters > 0
          ) {
            L.circle(coordinate, {
              radius: Math.min(point.accuracyMeters, 5000),
              color: '#1ABCBC',
              weight: 1,
              fillOpacity: 0.05,
            }).addTo(map);
          }
        }

        if (points.length === 1) {
          map.setView(
            [points[0]!.latitude, points[0]!.longitude],
            16,
          );
        } else {
          map.fitBounds(bounds.pad(0.18), {
            maxZoom: 16,
          });
        }

        setMapError('');
      } catch (error) {
        if (!disposed) {
          setMapError(
            error instanceof Error
              ? error.message
              : 'Unable to display the attendance map.',
          );
        }
      }
    };

    void renderMap();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="emptyState">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="stack">
      {mapError && (
        <div className="error" role="alert">
          {mapError}
        </div>
      )}
      <div
        ref={containerRef}
        aria-label={ariaLabel}
        role="region"
        style={{
          width: '100%',
          height: 360,
          minHeight: 320,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--border, #d8dee8)',
        }}
      />
      <small className="muted">
        Basemap © OpenStreetMap contributors. Employee names and
        attendance details are rendered by OPSIQO in the browser and
        are not embedded in the tile URL.
      </small>
    </div>
  );
}
