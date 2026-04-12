import express from 'express';
import axios from 'axios';

function getWeatherLabel(code) {
  if (code === 0) return 'Clear sky';
  if ([1, 2, 3].includes(code)) return 'Partly cloudy';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Unknown';
}

export function createWeatherRouter() {
  const router = express.Router();

  router.get('/', async (_request, response) => {
    try {
      // College Station, TX
      const latitude = 30.628;
      const longitude = -96.334;

      const weatherResponse = await axios.get(
        'https://api.open-meteo.com/v1/forecast',
        {
          params: {
            latitude,
            longitude,
            current: 'temperature_2m,weather_code,wind_speed_10m',
            temperature_unit: 'fahrenheit',
            wind_speed_unit: 'mph'
          }
        }
      );

      const current = weatherResponse.data?.current;

      if (!current) {
        return response.status(500).json({
          error: 'Weather data unavailable.'
        });
      }

      response.json({
        location: 'College Station, TX',
        temperature: current.temperature_2m,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        condition: getWeatherLabel(current.weather_code)
      });
    } catch (error) {
      console.error('Weather error:', error.response?.data || error.message);
      response.status(500).json({
        error: 'Failed to fetch weather.'
      });
    }
  });

  return router;
}