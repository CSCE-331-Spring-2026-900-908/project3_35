import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from './apiBase';

export default function PortalPage() {
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    async function loadWeather() {
      try {
        setWeatherLoading(true);
        setWeatherError('');

        const response = await fetch(apiUrl('/api/weather'));
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load weather.');
        }

        setWeather(data);
      } catch (error) {
        setWeatherError(error.message || 'Failed to load weather.');
      } finally {
        setWeatherLoading(false);
      }
    }

    loadWeather();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.kicker}>MOONWAKE TEA ATELIER</p>
        <h1 style={styles.title}>Point-of-Sales Portal</h1>
        <p style={styles.subtitle}>
          Select the interface that matches your role in the store.
        </p>

        <div style={styles.weatherCard}>
          <div style={styles.weatherHeader}>
            <div>
              <p style={styles.weatherKicker}>LIVE WEATHER</p>
              <h2 style={styles.weatherTitle}>College Station, TX</h2>
            </div>
          </div>

          {weatherLoading ? (
            <p style={styles.weatherText}>Loading weather...</p>
          ) : weatherError ? (
            <p style={styles.weatherError}>Weather unavailable: {weatherError}</p>
          ) : (
            <div style={styles.weatherGrid}>
              <div style={styles.weatherStat}>
                <p style={styles.weatherLabel}>Condition</p>
                <p style={styles.weatherValue}>{weather?.condition || 'Unknown'}</p>
              </div>

              <div style={styles.weatherStat}>
                <p style={styles.weatherLabel}>Temperature</p>
                <p style={styles.weatherValue}>
                  {typeof weather?.temperature === 'number'
                    ? `${weather.temperature}°F`
                    : 'N/A'}
                </p>
              </div>

              <div style={styles.weatherStat}>
                <p style={styles.weatherLabel}>Wind Speed</p>
                <p style={styles.weatherValue}>
                  {typeof weather?.windSpeed === 'number'
                    ? `${weather.windSpeed} mph`
                    : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={styles.grid}>
          <Link to="/customer" style={styles.linkCard}>
            <h2 style={styles.linkTitle}>Customer Kiosk</h2>
            <p style={styles.linkText}>
              Self-service ordering experience for customers in the lobby.
            </p>
          </Link>

          <Link to="/cashier" style={styles.linkCard}>
            <h2 style={styles.linkTitle}>Cashier Interface</h2>
            <p style={styles.linkText}>
              Counter-facing POS interface for staff taking and customizing orders.
            </p>
          </Link>

          <Link to="/manager" style={styles.linkCard}>
            <h2 style={styles.linkTitle}>Manager Dashboard</h2>
            <p style={styles.linkText}>
              Management view for reporting, inventory, and menu oversight.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '32px',
    background: 'linear-gradient(135deg, #efe7dc 0%, #e6ddd1 100%)',
    fontFamily: 'system-ui, sans-serif'
  },
  card: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: '#f8f3eb',
    borderRadius: '32px',
    padding: '40px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.08)'
  },
  kicker: {
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#7d6b5d',
    fontWeight: 700,
    marginBottom: '12px'
  },
  title: {
    fontSize: '3.5rem',
    lineHeight: 1,
    color: '#2f211b',
    marginBottom: '16px'
  },
  subtitle: {
    fontSize: '1.25rem',
    color: '#6b5b50',
    maxWidth: '700px',
    marginBottom: '32px'
  },
  weatherCard: {
    background: '#fffaf4',
    border: '1px solid #e3d8cb',
    borderRadius: '24px',
    padding: '24px',
    marginBottom: '32px'
  },
  weatherHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  weatherKicker: {
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#7d6b5d',
    fontWeight: 700,
    margin: 0,
    marginBottom: '8px',
    fontSize: '0.8rem'
  },
  weatherTitle: {
    color: '#6f3c20',
    margin: 0
  },
  weatherGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px'
  },
  weatherStat: {
    background: '#f8f3eb',
    border: '1px solid #e3d8cb',
    borderRadius: '18px',
    padding: '18px'
  },
  weatherLabel: {
    margin: 0,
    marginBottom: '8px',
    color: '#7d6b5d',
    fontSize: '0.9rem',
    fontWeight: 600
  },
  weatherValue: {
    margin: 0,
    color: '#2f211b',
    fontSize: '1.25rem',
    fontWeight: 700
  },
  weatherText: {
    color: '#65574e',
    lineHeight: 1.5,
    margin: 0
  },
  weatherError: {
    color: '#a33a2b',
    lineHeight: 1.5,
    margin: 0
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px'
  },
  linkCard: {
    textDecoration: 'none',
    background: '#fffaf4',
    border: '1px solid #e3d8cb',
    borderRadius: '24px',
    padding: '24px',
    color: 'inherit',
    display: 'block'
  },
  linkTitle: {
    color: '#6f3c20',
    marginBottom: '10px'
  },
  linkText: {
    color: '#65574e',
    lineHeight: 1.5
  }
};