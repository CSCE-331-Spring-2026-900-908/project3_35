import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';

function MapViewport({ boundsPoints }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(boundsPoints) || boundsPoints.length === 0) {
      return;
    }

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 13);
      return;
    }

    map.fitBounds(L.latLngBounds(boundsPoints), { padding: [24, 24] });
  }, [boundsPoints, map]);

  return null;
}

export default function LocationMap({
  selectedLocation,
  userCoordinates,
  routeCoordinates,
  labels
}) {
  const routePoints = useMemo(
    () => (Array.isArray(routeCoordinates) ? routeCoordinates.map((point) => [point.lat, point.lon]) : []),
    [routeCoordinates]
  );

  const destinationPoint = selectedLocation ? [selectedLocation.lat, selectedLocation.lon] : null;
  const originPoint = userCoordinates ? [userCoordinates.lat, userCoordinates.lon] : null;

  const boundsPoints = useMemo(() => {
    const points = [];

    if (originPoint) {
      points.push(originPoint);
    }

    if (routePoints.length > 0) {
      points.push(...routePoints);
    }

    if (destinationPoint) {
      points.push(destinationPoint);
    }

    return points;
  }, [destinationPoint, originPoint, routePoints]);

  if (!destinationPoint) {
    return null;
  }

  return (
    <MapContainer
      center={destinationPoint}
      zoom={13}
      scrollWheelZoom={false}
      className="location-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport boundsPoints={boundsPoints} />

      {routePoints.length > 0 ? (
        <Polyline positions={routePoints} pathOptions={{ color: '#6d3d1f', weight: 5, opacity: 0.9 }} />
      ) : null}

      {originPoint ? (
        <CircleMarker center={originPoint} radius={8} pathOptions={{ color: '#2f6f4f', fillColor: '#2f6f4f', fillOpacity: 1 }}>
          <Tooltip direction="top" offset={[0, -8]} permanent>
            {labels.startLabel}
          </Tooltip>
        </CircleMarker>
      ) : null}

      <CircleMarker center={destinationPoint} radius={8} pathOptions={{ color: '#c06a2c', fillColor: '#c06a2c', fillOpacity: 1 }}>
        <Tooltip direction="top" offset={[0, -8]} permanent>
          {labels.destinationLabel}
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}
