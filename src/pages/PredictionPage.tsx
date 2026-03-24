import React, { useState, useRef } from 'react';
import Switch from 'react-switch';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
import { Search, Wind, Zap, Activity, MapPin, Calendar, TrendingUp, Bell, BellOff, Navigation } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useNotifications } from '../contexts/NotificationContext';

interface WindData {
  city: string;
  currentSpeed: number;
  maxSpeed: number;
  direction: string;
  temperature: number;
  humidity: number;
  pressure: number;
  powerGeneration: number;
  efficiency: number;
  forecast: {
    time: string;
    speed: number;
    power: number;
  }[];
}


const API_KEY_PRED = '1f17f795128639f79920cea6fe9dcfd4';

const PredictionPage: React.FC = () => {
  const [city, setCity] = useState('');
  const [windData, setWindData] = useState<WindData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const { addSubscription, removeSubscription, isSubscribed, subscriptions, addNotification } = useNotifications();

  // Simulation panel state
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [simCity, setSimCity] = useState('');
  const [simOldWind, setSimOldWind] = useState(5);
  const [simNewWind, setSimNewWind] = useState(10);
  const [simTemp, setSimTemp] = useState(25);
  const [simOldTemp, setSimOldTemp] = useState(25);
  const [simRunning, setSimRunning] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const favs = localStorage.getItem('windcast_favorites');
    return favs ? JSON.parse(favs) : [];
  });
  // ...existing code...
  const [showLog, setShowLog] = useState(false);
  const activities = (() => {
    try {
      return JSON.parse(localStorage.getItem('windcast_activities') || '[]');
    } catch {
      return [];
    }
  })();
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('windcast_user') || '{}');
    } catch {
      return {};
    }
  })();
  const isAdmin = user.role === 'admin';

  // Export wind data as PDF (print the results section)
  const exportToPDF = () => {
    if (!windData) return;
    // Build a styled HTML for PDF export
    const summaryTable = `
      <table>
        <tr><th>City</th><td>${windData.city}</td></tr>
        <tr><th>Current Speed</th><td>${windData.currentSpeed} m/s</td></tr>
        <tr><th>Max Speed</th><td>${windData.maxSpeed} m/s</td></tr>
        <tr><th>Direction</th><td>${windData.direction}</td></tr>
        <tr><th>Temperature</th><td>${windData.temperature}°C</td></tr>
        <tr><th>Humidity</th><td>${windData.humidity}%</td></tr>
        <tr><th>Pressure</th><td>${windData.pressure} hPa</td></tr>
        <tr><th>Power Generation</th><td>${windData.powerGeneration} kW</td></tr>
        <tr><th>Efficiency</th><td>${windData.efficiency}%</td></tr>
      </table>
    `;
    const forecastRows = windData.forecast.map(f =>
      `<tr><td>${f.time}</td><td>${f.speed} m/s</td><td>${f.power} kW</td></tr>`
    ).join('');
    const forecastTable = `
      <table>
        <thead>
          <tr><th>Time</th><th>Speed</th><th>Power</th></tr>
        </thead>
        <tbody>
          ${forecastRows}
        </tbody>
      </table>
    `;
    const html = `
      <html>
        <head>
          <title>${windData.city} Wind Forecast</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #222; }
            h1, h2, h3 { color: #2563eb; margin-bottom: 12px; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; margin-bottom: 24px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f1f5f9; }
            .section { margin-bottom: 32px; }
          </style>
        </head>
        <body>
          <h1>Wind Forecast Report</h1>
          <h2>${windData.city}</h2>
          <div class="section">
            <h3>Current Conditions</h3>
            ${summaryTable}
          </div>
          <div class="section">
            <h3>24-Hour Forecast</h3>
            ${forecastTable}
          </div>
          <div style="margin-top:40px; font-size:12px; color:#888;">Generated on ${new Date().toLocaleString()}</div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Add city to favorites
  const addFavorite = (cityName: string) => {
    if (!favorites.includes(cityName)) {
      const updated = [cityName, ...favorites].slice(0, 10);
      setFavorites(updated);
      localStorage.setItem('windcast_favorites', JSON.stringify(updated));
    }
  };

  // Remove city from favorites
  const removeFavorite = (cityName: string) => {
    const updated = favorites.filter(fav => fav !== cityName);
    setFavorites(updated);
    localStorage.setItem('windcast_favorites', JSON.stringify(updated));
  };

  // Export wind data to CSV
  const exportToCSV = () => {
    if (!windData) return;
    let csv = `City,Current Speed,Max Speed,Direction,Temperature,Humidity,Pressure,Power Generation,Efficiency\n`;
    csv += `${windData.city},${windData.currentSpeed},${windData.maxSpeed},${windData.direction},${windData.temperature},${windData.humidity},${windData.pressure},${windData.powerGeneration},${windData.efficiency}\n`;
    csv += `\nTime,Speed,Power\n`;
    windData.forecast.forEach(f => {
      csv += `${f.time},${f.speed},${f.power}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${windData.city}_wind_forecast.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  // Helper to convert wind degree to compass direction
  const getWindDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const ix = Math.round(deg / 45) % 8;
    return directions[ix];
  };

  // Use current GPS location
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    toast.info('Detecting your location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLoading(true);
        setError('');
        setWindData(null);
        try {
          const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY_PRED}&units=metric`
          );
          if (!weatherRes.ok) throw new Error('Failed to fetch location weather');
          const w = await weatherRes.json();
          setCity(w.name);
          const data = await fetchWindData(w.name);
          setWindData(data);
          // Auto-subscribe current location to weather alerts
          if (!isSubscribed(w.name)) {
            addSubscription(w.name);
            toast.success(`📍 Weather loaded for ${w.name} — you'll receive email & push alerts when conditions change!`);
          } else {
            toast.success(`Weather loaded for your location: ${w.name}`);
          }
        } catch (err: any) {
          setError(err.message ?? 'Failed to fetch location weather');
        } finally {
          setLoading(false);
        }
      },
      () => {
        toast.error('Location access denied. Please allow location access and try again.');
      }
    );
  };

  // Identify top 3 power windows in forecast
  const getPowerWindows = (forecast: WindData['forecast']) => {
    const scored = forecast.slice(0, 8).map((f, i) => ({ ...f, index: i, score: f.speed }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  };

  // Wind change velocity: rate of change between consecutive forecast points
  const getWindVelocity = (forecast: WindData['forecast']) => {
    if (forecast.length < 2) return null;
    const recent = forecast.slice(0, 4);
    const changes = recent.slice(1).map((f, i) => f.speed - recent[i].speed);
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    return avgChange;
  };

  // Fetch weather and forecast data from OpenWeather API
  const fetchWindData = async (cityName: string): Promise<WindData> => {
    const apiKey = API_KEY_PRED;
    // Get current weather
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=metric`
    );
    if (!weatherRes.ok) throw new Error('City not found');
    const weather = await weatherRes.json();

    // Get 24-hour forecast (3-hour intervals, so 8 points)
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=metric`
    );
    if (!forecastRes.ok) throw new Error('Forecast not available');
    const forecastData = await forecastRes.json();

    // Compose 24-hour forecast (interpolate to 24 points)
    const forecast: { time: string; speed: number; power: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const item = forecastData.list[i];
      if (!item) continue;
      const dt = new Date(item.dt * 1000);
      const hour = dt.getHours();
      const windSpeed = item.wind.speed;
      const power = Math.round(windSpeed * windSpeed * 0.8 * 100) / 100;
      forecast.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        speed: Math.round(windSpeed * 100) / 100,
        power
      });
    }
    // Fill up to 24 points by repeating or interpolating
    while (forecast.length < 24) {
      forecast.push(forecast[forecast.length - 1]);
    }

    return {
      city: weather.name,
      currentSpeed: Math.round(weather.wind.speed * 100) / 100,
      maxSpeed: Math.round((weather.wind.gust || weather.wind.speed) * 100) / 100,
      direction: getWindDirection(weather.wind.deg),
      temperature: Math.round(weather.main.temp * 10) / 10,
      humidity: weather.main.humidity,
      pressure: Math.round(weather.main.pressure * 10) / 10,
      powerGeneration: Math.round(weather.wind.speed * weather.wind.speed * 0.5 * 100) / 100,
      efficiency: Math.round((85 + Math.random() * 10) * 10) / 10, // Simulated
      forecast
    };
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) {
      setError('Please enter a city name');
      return;
    }

    setLoading(true);
    setError('');
    setWindData(null);

    try {
      const data = await fetchWindData(city);
      setWindData(data);

      // Auto-subscribe to weather alerts for every searched city
      if (!isSubscribed(data.city)) {
        addSubscription(data.city);
        toast.info(`🔔 Auto-subscribed to ${data.city} — you'll get email & push alerts when weather changes.`, {
          autoClose: 4000,
        });
      }

      // Show weather alert notification if wind speed is high
      if (data.currentSpeed > 12) {
        toast.warn(`⚠️ High wind alert in ${data.city}: ${data.currentSpeed} m/s!`, {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else if (data.currentSpeed > 8) {
        toast.info(`Wind is strong in ${data.city}: ${data.currentSpeed} m/s.`, {
          position: 'top-right',
          autoClose: 4000,
        });
      }

      // Log activity
      const activities = JSON.parse(localStorage.getItem('windcast_activities') || '[]');
      activities.unshift({
        id: Date.now(),
        action: 'Wind Prediction',
        details: `Generated forecast for ${city}`,
        timestamp: new Date().toISOString(),
        user: JSON.parse(localStorage.getItem('windcast_user') || '{}').name || 'Unknown'
      });
      localStorage.setItem('windcast_activities', JSON.stringify(activities.slice(0, 100)));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wind data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Simulate a weather change to test notifications ─────────────────────────
  const handleSimulate = async () => {
    const targetCity = simCity || windData?.city || subscriptions[0]?.city || '';
    if (!targetCity) {
      toast.error('Search a city first or select one to simulate.');
      return;
    }
    setSimRunning(true);

    const windChange  = simNewWind - simOldWind;
    const absChange   = Math.abs(windChange);
    const tempDrop    = simOldTemp - simTemp;

    // Simulate wind change notification
    if (absChange >= 1) {
      const direction = windChange > 0 ? 'increased ↑' : 'decreased ↓';
      addNotification({
        type:     'wind_change',
        city:     targetCity,
        message:  `[SIM] Wind ${direction} by ${absChange.toFixed(1)} m/s`,
        detail:   `Simulated: ${simOldWind} m/s → ${simNewWind} m/s`,
        severity: absChange >= 6 ? 'critical' : absChange >= 4 ? 'high' : absChange >= 2 ? 'medium' : 'low',
      });
    }

    // Simulate threshold breach
    const sub = subscriptions.find(s => s.city === targetCity);
    if (sub && simNewWind > sub.windThreshold && simOldWind <= sub.windThreshold) {
      addNotification({
        type:     'wind_alert',
        city:     targetCity,
        message:  `[SIM] Wind exceeded ${sub.windThreshold} m/s threshold!`,
        detail:   `Simulated current: ${simNewWind} m/s`,
        severity: simNewWind > 15 ? 'critical' : 'high',
      });
    }

    // Simulate temperature drop
    if (tempDrop >= 2) {
      addNotification({
        type:     'temp_alert',
        city:     targetCity,
        message:  `[SIM] Temperature dropped ${tempDrop.toFixed(1)}°C`,
        detail:   `Simulated: ${simOldTemp}°C → ${simTemp}°C`,
        severity: 'medium',
      });
    }

    // Simulate energy opportunity
    if (simNewWind >= 8 && simNewWind <= 15) {
      const score = Math.round((simNewWind / 15) * 100);
      addNotification({
        type:     'energy_opportunity',
        city:     targetCity,
        message:  `[SIM] Optimal energy window — Score: ${score}/100`,
        detail:   `Simulated wind: ${simNewWind} m/s`,
        severity: 'info',
      });
    }

    // Also send email alert
    try {
      const u = JSON.parse(localStorage.getItem('windcast_user') || '{}');
      if (u.email) {
        const { sendWeatherAlertEmail } = await import('../services/weatherEmailService');
        await sendWeatherAlertEmail({
          userEmail:   u.email,
          userName:    u.name || 'User',
          city:        targetCity,
          alertType:   'Simulated Wind Change',
          message:     `Wind ${windChange >= 0 ? 'increased' : 'decreased'} by ${absChange.toFixed(1)} m/s`,
          detail:      `Simulated: ${simOldWind} m/s → ${simNewWind} m/s`,
          windSpeed:   simNewWind,
          temperature: simTemp,
        });
        toast.success(`✅ Simulation triggered! Check notifications bell + your email (${u.email})`);
      } else {
        toast.success('✅ Simulation triggered! Check the notifications bell.');
      }
    } catch (_) {
      toast.success('✅ Simulation triggered! Check the notifications bell.');
    }

    setSimRunning(false);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900" aria-label="Wind Forecast Main Content">
      <Navbar />
      <ToastContainer />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4" tabIndex={0} aria-label="Wind Speed Prediction Heading">Wind Speed Prediction</h1>
          <p className="text-gray-600 dark:text-gray-300" tabIndex={0} aria-label="Wind Speed Prediction Description">
            Enter a city name to get real-time wind data and power generation forecasts.
          </p>
        </header>

        {/* Search Form */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8" aria-label="Search Form Section">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4" aria-label="City Search Form">
            <div className="flex-1">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city name (e.g., New York, London, Tokyo)"
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="City Name Input"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 rounded-lg text-white font-medium flex items-center justify-center space-x-2 ${
                loading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors`}
              aria-label="Predict Button"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              <span>{loading ? 'Analyzing...' : 'Predict'}</span>
            </button>
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={loading}
              className="px-4 py-3 rounded-lg text-white font-medium flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
              aria-label="Use my current location"
            >
              <Navigation className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">My Location</span>
            </button>
          </form>
          {/* Favorites List */}
          {favorites.length > 0 && (
            <nav className="mt-4 flex flex-wrap gap-2" aria-label="Favorite Cities">
              <span className="text-sm text-gray-500 mr-2">Favorites:</span>
              {favorites.map(fav => (
                <button
                  key={fav}
                  onClick={() => setCity(fav)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition"
                  aria-label={`Select favorite city ${fav}`}
                >
                  {fav}
                  <span
                    onClick={e => { e.stopPropagation(); removeFavorite(fav); }}
                    className="ml-2 text-red-500 cursor-pointer font-bold"
                    title="Remove from favorites"
                    aria-label={`Remove ${fav} from favorites`}
                  >×</span>
                </button>
              ))}
              {/* Admin tools */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setFavorites([]);
                    localStorage.setItem('windcast_favorites', JSON.stringify([]));
                    toast.success('Favorites cleared by admin');
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-medium hover:bg-red-700 transition ml-4"
                  aria-label="Clear all favorites (admin)"
                >
                  Clear All
                </button>
              )}
            </nav>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg" role="alert">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
          {/* Activity log button only */}
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => setShowLog(true)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
              aria-label="View activity log"
            >
              View Activity Log
            </button>
          </div>
          {/* Activity Log Modal */}
          {showLog && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full relative">
                <button
                  onClick={() => setShowLog(false)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
                  aria-label="Close activity log"
                >×</button>
                <h2 className="text-xl font-bold mb-4">Recent Activities</h2>
                <ul className="max-h-80 overflow-y-auto">
                  {activities.length === 0 ? (
                    <li className="text-gray-500">No activities found.</li>
                  ) : (
                    activities.map((act: any) => (
                      <li key={act.id} className="mb-2 border-b pb-2 last:border-b-0">
                        <div className="text-sm text-gray-700">{act.details}</div>
                        <div className="text-xs text-gray-400">{act.timestamp} - {act.user}</div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
          {/* Admin log tools */}
          {isAdmin && (
            <div className="mt-4">
              <button
                onClick={() => {
                  localStorage.setItem('windcast_activities', JSON.stringify([]));
                  toast.success('Activity log cleared by admin');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
                aria-label="Clear activity log (admin)"
              >
                Clear Activity Log
              </button>
            </div>
          )}
        </section>

        {/* ── Simulation Panel ─────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <button
            onClick={() => setShowSimPanel(p => !p)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-800 dark:text-amber-300 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
          >
            <span>🧪</span>
            {showSimPanel ? 'Hide' : 'Show'} Notification Simulator
          </button>

          {showSimPanel && (
            <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5">
              <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-2">
                🧪 Simulate Weather Change
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-4">
                Manually trigger a weather change to test in-app notifications, mobile push, and email alerts.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* City selector */}
                <div>
                  <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">City</label>
                  <select
                    value={simCity}
                    onChange={e => setSimCity(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">
                      {windData ? windData.city : subscriptions.length ? '— pick a city —' : '(search a city first)'}
                    </option>
                    {windData && <option value={windData.city}>{windData.city} (current)</option>}
                    {subscriptions.filter(s => s.city !== windData?.city).map(s => (
                      <option key={s.city} value={s.city}>{s.city}</option>
                    ))}
                  </select>
                </div>

                {/* Old wind speed */}
                <div>
                  <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    Previous Wind Speed: <span className="font-bold">{simOldWind} m/s</span>
                  </label>
                  <input type="range" min={0} max={30} step={0.5}
                    value={simOldWind} onChange={e => setSimOldWind(Number(e.target.value))}
                    className="w-full accent-amber-500" />
                </div>

                {/* New wind speed */}
                <div>
                  <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    New Wind Speed: <span className="font-bold text-blue-600">{simNewWind} m/s</span>
                    {simNewWind - simOldWind !== 0 && (
                      <span className={`ml-1 ${simNewWind > simOldWind ? 'text-green-600' : 'text-red-500'}`}>
                        ({simNewWind > simOldWind ? '+' : ''}{(simNewWind - simOldWind).toFixed(1)})
                      </span>
                    )}
                  </label>
                  <input type="range" min={0} max={30} step={0.5}
                    value={simNewWind} onChange={e => setSimNewWind(Number(e.target.value))}
                    className="w-full accent-blue-500" />
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    Temperature: <span className="font-bold">{simOldTemp}°C → {simTemp}°C</span>
                    {simOldTemp - simTemp > 0 && (
                      <span className="ml-1 text-red-500">(-{(simOldTemp - simTemp).toFixed(1)})</span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input type="range" min={-10} max={45} step={1}
                      value={simOldTemp} onChange={e => setSimOldTemp(Number(e.target.value))}
                      className="w-full accent-orange-400" />
                    <input type="range" min={-10} max={45} step={1}
                      value={simTemp} onChange={e => setSimTemp(Number(e.target.value))}
                      className="w-full accent-orange-600" />
                  </div>
                </div>
              </div>

              {/* Preview what will fire */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Math.abs(simNewWind - simOldWind) >= 1 && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                    💨 Wind change alert will fire
                  </span>
                )}
                {Math.abs(simNewWind - simOldWind) < 1 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full text-xs">
                    Wind change &lt; 1 m/s — no wind alert
                  </span>
                )}
                {simNewWind >= 8 && simNewWind <= 15 && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                    🌿 Energy opportunity alert will fire
                  </span>
                )}
                {simOldTemp - simTemp >= 2 && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
                    🌡️ Temperature drop alert will fire
                  </span>
                )}
              </div>

              <button
                onClick={handleSimulate}
                disabled={simRunning}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                {simRunning ? '⏳ Sending...' : '🚀 Fire Simulation'}
              </button>
            </div>
          )}
        </section>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <span className="text-blue-600 dark:text-blue-300 text-lg font-semibold animate-pulse">Loading weather data...</span>
          </div>
        )}

        {/* Results */}
        {windData && !loading && (
          <div ref={printRef} className="space-y-6">
            {/* Export and Favorite Actions */}
            <div className="flex flex-wrap gap-4 items-center mb-2">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
              >
                Export as CSV
              </button>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
              >
                Export as PDF
              </button>
              {favorites.includes(windData.city) ? (
                <button
                  onClick={() => removeFavorite(windData.city)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors text-sm"
                >
                  Remove from Favorites
                </button>
              ) : (
                <button
                  onClick={() => addFavorite(windData.city)}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm"
                >
                  Add to Favorites
                </button>
              )}
              {/* Subscribe to alerts */}
              {isSubscribed(windData.city) ? (
                <button
                  onClick={() => { removeSubscription(windData.city); toast.info(`Unsubscribed from ${windData.city} alerts`); }}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-medium hover:bg-yellow-200 transition-colors text-sm"
                >
                  <Bell className="h-4 w-4" />
                  Subscribed
                </button>
              ) : (
                <button
                  onClick={() => { addSubscription(windData.city); toast.success(`Subscribed to ${windData.city} — you'll receive weather change alerts!`); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                >
                  <BellOff className="h-4 w-4" />
                  Subscribe to Alerts
                </button>
              )}
            </div>
            {/* Current Conditions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Current Conditions - {windData.city}</h2>
                <div className="flex items-center space-x-2 text-gray-500">
                  <Calendar className="h-5 w-5" />
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Wind className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Wind Speed</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{windData.currentSpeed} m/s</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Direction: {windData.direction}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Power Generation</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-300">{windData.powerGeneration} kW</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Efficiency: {windData.efficiency}%</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Max Wind Speed</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-300">{windData.maxSpeed} m/s</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Today's peak</p>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Temperature</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-300">{windData.temperature}°C</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Humidity: {windData.humidity}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Additional Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Atmospheric Pressure</h3>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-300 mb-2">{windData.pressure} hPa</div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {windData.pressure > 1013 ? 'High pressure' : 'Low pressure'} conditions
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Energy Output</h3>
                <div className="text-3xl font-bold text-green-600 dark:text-green-300 mb-2">
                  {Math.round(windData.powerGeneration * 24)} kWh
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Estimated daily generation</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Wind Quality</h3>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-300 mb-2">
                  {windData.currentSpeed > 12 ? 'Excellent' : windData.currentSpeed > 8 ? 'Good' : 'Fair'}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">For wind power generation</p>
              </div>
            </div>
            {/* 24-Hour Forecast & Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">24-Hour Forecast</h3>
              <div className="overflow-x-auto">
                <div className="flex space-x-4 pb-4">
                  {windData.forecast.map((item, index) => (
                    <div key={index} className="flex-shrink-0 bg-gray-50 p-3 rounded-lg text-center min-w-[100px]">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{item.time}</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-300 mb-1">{item.speed} m/s</div>
                      <div className="text-sm text-green-600 dark:text-green-300">{item.power} kW</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Chart visualization */}
              <div className="mt-8">
                <Line
                  data={{
                    labels: windData.forecast.map(f => f.time),
                    datasets: [
                      {
                        label: 'Wind Speed (m/s)',
                        data: windData.forecast.map(f => f.speed),
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37,99,235,0.1)',
                        tension: 0.3,
                      },
                      {
                        label: 'Power (kW)',
                        data: windData.forecast.map(f => f.power),
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34,197,94,0.1)',
                        tension: 0.3,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: true, text: 'Wind Speed & Power Forecast' }
                    },
                    scales: {
                      x: { title: { display: true, text: 'Time' } },
                      y: { title: { display: true, text: 'Value' } }
                    }
                  }}
                  height={300}
                />
              </div>
            </div>

            {/* ── Energy Advisor ── UNIQUE FEATURE */}
            {(() => {
              const powerWindows = getPowerWindows(windData.forecast);
              const velocity = getWindVelocity(windData.forecast);
              return (
                <div className="bg-gradient-to-br from-green-50 to-cyan-50 dark:from-green-900/20 dark:to-cyan-900/20 rounded-xl shadow-lg p-6 border border-green-100 dark:border-green-800">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-600" />
                    Wind Energy Advisor
                  </h3>

                  {/* Wind acceleration indicator */}
                  {velocity !== null && (
                    <div className={`mb-5 p-4 rounded-xl border ${Math.abs(velocity) < 0.5 ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : velocity > 0 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'}`}>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Wind Acceleration
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {Math.abs(velocity) < 0.5 ? '→' : velocity > 0 ? '↗' : '↘'}
                        </span>
                        <div>
                          <p className={`text-base font-bold ${Math.abs(velocity) < 0.5 ? 'text-gray-600 dark:text-gray-400' : velocity > 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                            {Math.abs(velocity) < 0.5
                              ? 'Stable — wind speed is steady'
                              : velocity > 0
                              ? `Accelerating +${velocity.toFixed(1)} m/s per 3h — conditions improving`
                              : `Decelerating ${velocity.toFixed(1)} m/s per 3h — conditions weakening`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Power Windows */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      🏆 Top 3 Energy Harvest Windows Today
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {powerWindows.map((w, i) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        const quality = w.speed > 12 ? 'Excellent' : w.speed > 8 ? 'Good' : 'Fair';
                        const qualityColor = w.speed > 12 ? 'text-green-700 dark:text-green-300' : w.speed > 8 ? 'text-blue-700 dark:text-blue-300' : 'text-yellow-700 dark:text-yellow-300';
                        return (
                          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-green-100 dark:border-green-900">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{medals[i]}</span>
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{w.time}</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{w.speed} m/s</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{w.power} kW potential</p>
                            <p className={`text-xs font-semibold mt-1 ${qualityColor}`}>{quality}</p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      * Based on the 24-hour forecast. Subscribe to get notified when these windows are approaching.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </section>
    </main>
  );
};

export default PredictionPage;