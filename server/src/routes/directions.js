import express from 'express';
import axios from 'axios';

function isLatitude(value) {
  return Number.isFinite(value) && Math.abs(value) <= 90;
}

function isLongitude(value) {
  return Number.isFinite(value) && Math.abs(value) <= 180;
}

function toMiles(meters) {
  return Number((Number(meters || 0) / 1609.344).toFixed(1));
}

function toMinutes(seconds) {
  return Math.max(1, Math.round(Number(seconds || 0) / 60));
}

function normalizePoint(value) {
  return {
    lat: Number(value?.lat),
    lon: Number(value?.lon)
  };
}

export function createDirectionsRouter() {
  const router = express.Router();

  router.post('/', async (request, response) => {
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;

    if (!apiKey) {
      return response.status(503).json({
        error: 'Directions service is not configured. Add OPENROUTESERVICE_API_KEY to the server environment.'
      });
    }

    const origin = normalizePoint(request.body?.origin);
    const destination = normalizePoint(request.body?.destination);

    if (
      !isLatitude(origin.lat)
      || !isLongitude(origin.lon)
      || !isLatitude(destination.lat)
      || !isLongitude(destination.lon)
    ) {
      return response.status(400).json({
        error: 'Valid origin and destination coordinates are required.'
      });
    }

    try {
      const directionsResponse = await axios.post(
        'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
        {
          coordinates: [
            [origin.lon, origin.lat],
            [destination.lon, destination.lat]
          ],
          instructions: true
        },
        {
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const feature = directionsResponse.data?.features?.[0];
      const summary = feature?.properties?.summary;
      const segments = Array.isArray(feature?.properties?.segments) ? feature.properties.segments : [];
      const steps = segments.flatMap((segment) => (Array.isArray(segment?.steps) ? segment.steps : []));
      const coordinates = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : [];

      if (!summary || coordinates.length === 0) {
        return response.status(502).json({
          error: 'Directions data was unavailable for this route.'
        });
      }

      response.json({
        summary: {
          distanceMiles: toMiles(summary.distance),
          durationMinutes: toMinutes(summary.duration)
        },
        steps: steps.map((step) => ({
          instruction: step.instruction || 'Continue to the destination.',
          distanceMiles: toMiles(step.distance),
          durationMinutes: toMinutes(step.duration)
        })),
        routeCoordinates: coordinates.map(([lon, lat]) => ({
          lat,
          lon
        }))
      });
    } catch (error) {
      console.error('Directions error:', error.response?.data || error.message);
      response.status(500).json({
        error: error.response?.data?.error?.message || 'Failed to fetch directions.'
      });
    }
  });

  return router;
}
