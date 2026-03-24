import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Plus, X, RefreshCw, Bell, BellOff, Wind, Zap, Thermometer, Droplets, TrendingUp, TrendingDown, Minus, Navigation } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useNotifications } from '../contexts/NotificationContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_KEY = '1f17f795128639f79920cea6fe9dcfd4';
const REFRESH_INTERVAL = 60; // seconds

interface CityWeather {
  city: string;
  windSpeed: number;
  windDir: string;
  windDeg: number;
  gust: number;
  temperature: number;
  humidity: number;
  pressure: number;
  feelsLike: number;
  description: string;
  powerGeneration: number;
  energyScore: number;
  prevWindSpeed: number | null;
  lastUpdated: string;
  loading: boolean;
  error: string | null;
}

// Compass direction from degrees
const degToDir = (deg: number) => {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
};

// Energy Harvest Score: composite 0-100
const calcEnergyScore = (windSpeed: number, pressure: number, humidity: number): number => {
  // Wind speed factor (0-55 pts): optimal 8-14 m/s
  let wScore = 0;
  if (windSpeed >= 10 && windSpeed <= 14) wScore = 55;
  else if (windSpeed >= 8 && windSpeed < 10) wScore = 45;
  else if (windSpeed >= 14 && windSpeed <= 18) wScore = 40;
  else if (windSpeed >= 6 && windSpeed < 8) wScore = 30;
  else if (windSpeed >= 4 && windSpeed < 6) wScore = 18;
  else if (windSpeed > 18) wScore = 20; // too fast, turbine safety
  else wScore = 8;

  // Pressure factor (0-25 pts): high pressure = more stable air
  let pScore = 0;
  if (pressure >= 1020) pScore = 25;
  else if (pressure >= 1013) pScore = 18;
  else if (pressure >= 1005) pScore = 12;
  else pScore = 5;

  // Humidity factor (0-20 pts): lower humidity = less air resistance
  let hScore = 0;
  if (humidity <= 40) hScore = 20;
  else if (humidity <= 60) hScore = 15;
  else if (humidity <= 75) hScore = 10;
  else hScore = 5;

  return Math.min(100, Math.round(wScore + pScore + hScore));
};

const scoreLabel = (score: number): { label: string; color: string; bg: string } => {
  if (score >= 80) return { label: 'Excellent', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-500' };
  if (score >= 60) return { label: 'Good', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-500' };
  if (score >= 40) return { label: 'Fair', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-500' };
  return { label: 'Poor', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-400' };
};

// Wind compass SVG
const WindCompass: React.FC<{ deg: number; speed: number }> = ({ deg, speed }) => (
  <div className="relative w-16 h-16 flex-shrink-0">
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="46" fill="none" stroke="#e5e7eb" strokeWidth="2" className="dark:stroke-gray-600" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-gray-700" />
      {['N','E','S','W'].map((d, i) => {
        const angle = i * 90;
        const rad = (angle - 90) * (Math.PI / 180);
        const x = 50 + 40 * Math.cos(rad);
        const y = 50 + 40 * Math.sin(rad);
        return <text key={d} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#9ca3af" fontWeight="600">{d}</text>;
      })}
      <g transform={`rotate(${deg}, 50, 50)`}>
        {/* North arrow (blue) */}
        <polygon points="50,12 46,52 50,47 54,52" fill="#2563eb" />
        {/* South arrow (gray) */}
        <polygon points="50,88 46,48 50,53 54,48" fill="#d1d5db" />
      </g>
      <circle cx="50" cy="50" r="5" fill="#2563eb" />
    </svg>
    <div className="absolute inset-0 flex items-end justify-center pb-0.5">
      <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 leading-none">{speed}m/s</span>
    </div>
  </div>
);

// Change trend indicator
const TrendIcon: React.FC<{ current: number; prev: number | null }> = ({ current, prev }) => {
  if (prev === null) return <Minus className="h-4 w-4 text-gray-400" />;
  const diff = current - prev;
  if (diff > 0.5) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (diff < -0.5) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
};

const emptyCity = (city: string): CityWeather => ({
  city, windSpeed: 0, windDir: 'N', windDeg: 0, gust: 0,
  temperature: 0, humidity: 0, pressure: 1013, feelsLike: 0,
  description: '', powerGeneration: 0, energyScore: 0,
  prevWindSpeed: null, lastUpdated: '', loading: true, error: null,
});

const MonitorPage: React.FC = () => {
  const [cities, setCities] = useState<CityWeather[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('windcast_monitor_cities') || '[]') as string[];
      return saved.slice(0, 4).map(emptyCity);
    } catch { return []; }
  });
  const [inputCity, setInputCity] = useState('');
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const countdownRef = useRef<number | null>(null);
  const refreshRef = useRef<number | null>(null);
  const { addSubscription, removeSubscription, isSubscribed } = useNotifications();

  const fetchCity = async (cityName: string, prevSpeed: number | null = null): Promise<CityWeather> => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=metric`
      );
      if (!res.ok) throw new Error('City not found');
      const d = await res.json();
      const windSpeed = Math.round(d.wind.speed * 10) / 10;
      const pressure = d.main.pressure;
      const humidity = d.main.humidity;
      return {
        city: d.name,
        windSpeed,
        windDir: degToDir(d.wind.deg ?? 0),
        windDeg: d.wind.deg ?? 0,
        gust: Math.round((d.wind.gust ?? d.wind.speed) * 10) / 10,
        temperature: Math.round(d.main.temp * 10) / 10,
        humidity,
        pressure,
        feelsLike: Math.round(d.main.feels_like * 10) / 10,
        description: d.weather?.[0]?.description ?? '',
        powerGeneration: Math.round(windSpeed * windSpeed * 0.5 * 10) / 10,
        energyScore: calcEnergyScore(windSpeed, pressure, humidity),
        prevWindSpeed: prevSpeed,
        lastUpdated: new Date().toLocaleTimeString(),
        loading: false,
        error: null,
      };
    } catch (e: any) {
      return { ...emptyCity(cityName), loading: false, error: e.message ?? 'Failed to fetch' };
    }
  };

  const refreshAll = useCallback(async () => {
    if (cities.length === 0) return;
    setIsRefreshing(true);
    setCountdown(REFRESH_INTERVAL);
    const updated = await Promise.all(
      cities.map(c => fetchCity(c.city, c.windSpeed))
    );
    setCities(updated);
    setIsRefreshing(false);
  }, [cities]);

  // Auto-refresh countdown
  useEffect(() => {
    countdownRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refreshAll();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [refreshAll]);

  // Initial fetch for pre-loaded cities
  useEffect(() => {
    if (cities.length > 0 && cities.some(c => c.loading)) {
      Promise.all(cities.map(c => fetchCity(c.city))).then(setCities);
    }
  }, []); // eslint-disable-line

  const addCity = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputCity.trim();
    if (!trimmed) return;
    if (cities.length >= 4) {
      toast.warn('Maximum 4 cities. Remove one to add another.');
      return;
    }
    if (cities.some(c => c.city.toLowerCase() === trimmed.toLowerCase())) {
      toast.info('City already in monitor.');
      return;
    }
    const placeholder = emptyCity(trimmed);
    setCities(prev => [...prev, placeholder]);
    setInputCity('');
    const fetched = await fetchCity(trimmed);
    setCities(prev => {
      const updated = prev.map(c => c.city === trimmed ? fetched : c);
      localStorage.setItem('windcast_monitor_cities', JSON.stringify(updated.map(c => c.city)));
      return updated;
    });
  };

  const removeCity = (cityName: string) => {
    setCities(prev => {
      const updated = prev.filter(c => c.city !== cityName);
      localStorage.setItem('windcast_monitor_cities', JSON.stringify(updated.map(c => c.city)));
      return updated;
    });
  };

  const addCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    toast.info('Detecting your location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
          );
          if (!res.ok) throw new Error('Failed to get location weather');
          const d = await res.json();
          const cityName = d.name;
          if (cities.some(c => c.city.toLowerCase() === cityName.toLowerCase())) {
            toast.info(`${cityName} is already in the monitor.`);
            return;
          }
          if (cities.length >= 4) {
            toast.warn('Maximum 4 cities. Remove one first.');
            return;
          }
          const windSpeed = Math.round(d.wind.speed * 10) / 10;
          const pressure = d.main.pressure;
          const humidity = d.main.humidity;
          const newCity: CityWeather = {
            city: cityName,
            windSpeed,
            windDir: degToDir(d.wind.deg ?? 0),
            windDeg: d.wind.deg ?? 0,
            gust: Math.round((d.wind.gust ?? d.wind.speed) * 10) / 10,
            temperature: Math.round(d.main.temp * 10) / 10,
            humidity,
            pressure,
            feelsLike: Math.round(d.main.feels_like * 10) / 10,
            description: d.weather?.[0]?.description ?? '',
            powerGeneration: Math.round(windSpeed * windSpeed * 0.5 * 10) / 10,
            energyScore: calcEnergyScore(windSpeed, pressure, humidity),
            prevWindSpeed: null,
            lastUpdated: new Date().toLocaleTimeString(),
            loading: false,
            error: null,
          };
          setCities(prev => {
            const updated = [...prev, newCity];
            localStorage.setItem('windcast_monitor_cities', JSON.stringify(updated.map(c => c.city)));
            return updated;
          });
          toast.success(`Added your location: ${cityName}`);
        } catch {
          toast.error('Could not fetch weather for your location.');
        }
      },
      () => toast.error('Location access denied. Please allow location access.')
    );
  };

  const toggleSubscription = (city: string) => {
    if (isSubscribed(city)) {
      removeSubscription(city);
      toast.info(`Unsubscribed from ${city}`);
    } else {
      addSubscription(city);
      toast.success(`Subscribed to ${city} alerts!`);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      <ToastContainer />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live City Monitor</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                Real-time wind monitoring for up to 4 cities — auto-refreshes every {REFRESH_INTERVAL}s
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refreshing in <span className="font-bold text-blue-600 dark:text-blue-400">{countdown}s</span></span>
              </div>
              <button
                onClick={() => refreshAll()}
                disabled={isRefreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                Refresh Now
              </button>
            </div>
          </div>
        </header>

        {/* Add City Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-6">
          <form onSubmit={addCity} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={inputCity}
                onChange={e => setInputCity(e.target.value)}
                placeholder="Add a city to monitor (e.g., Tokyo, Paris)"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={cities.length >= 4}
              />
            </div>
            <button
              type="submit"
              disabled={cities.length >= 4}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add City
            </button>
            <button
              type="button"
              onClick={addCurrentLocation}
              disabled={cities.length >= 4}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              <Navigation className="h-4 w-4" />
              My Location
            </button>
          </form>
          {cities.length >= 4 && (
            <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">Maximum 4 cities reached. Remove one to add another.</p>
          )}
        </div>

        {/* Empty state */}
        {cities.length === 0 && (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <Wind className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">No cities in monitor</p>
            <p className="text-sm mt-1">Add up to 4 cities or use your current location to start monitoring.</p>
          </div>
        )}

        {/* City Cards Grid */}
        <div className={`grid gap-6 ${cities.length === 1 ? 'grid-cols-1 max-w-xl' : cities.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
          {cities.map(c => {
            const { label, color, bg } = scoreLabel(c.energyScore);
            const subscribed = isSubscribed(c.city);

            return (
              <div key={c.city} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-200" />
                    <span className="text-white font-bold">{c.city}</span>
                    {c.lastUpdated && <span className="text-blue-200 text-xs">· {c.lastUpdated}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSubscription(c.city)}
                      title={subscribed ? 'Unsubscribe from alerts' : 'Subscribe to alerts'}
                      className="p-1 rounded-lg hover:bg-blue-500 transition"
                    >
                      {subscribed
                        ? <Bell className="h-4 w-4 text-yellow-300" />
                        : <BellOff className="h-4 w-4 text-blue-200" />}
                    </button>
                    <button onClick={() => removeCity(c.city)} className="p-1 rounded-lg hover:bg-blue-500 transition">
                      <X className="h-4 w-4 text-blue-200" />
                    </button>
                  </div>
                </div>

                {c.loading ? (
                  <div className="flex items-center justify-center py-12 text-blue-500 dark:text-blue-400">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : c.error ? (
                  <div className="py-8 text-center text-red-500 dark:text-red-400 text-sm px-4">{c.error}</div>
                ) : (
                  <div className="p-5">
                    {/* Top row: compass + main metrics */}
                    <div className="flex items-start gap-4 mb-4">
                      <WindCompass deg={c.windDeg} speed={c.windSpeed} />
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2.5">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Wind className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Wind</span>
                            <TrendIcon current={c.windSpeed} prev={c.prevWindSpeed} />
                          </div>
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{c.windSpeed} m/s</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{c.windDir} · gust {c.gust}</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-2.5">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Temp</span>
                          </div>
                          <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{c.temperature}°C</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">feels {c.feelsLike}°C</p>
                        </div>
                        <div className="bg-cyan-50 dark:bg-cyan-900/30 rounded-lg p-2.5">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Droplets className="h-3.5 w-3.5 text-cyan-500" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Humidity</span>
                          </div>
                          <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{c.humidity}%</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{c.pressure} hPa</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2.5">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Zap className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Power</span>
                          </div>
                          <p className="text-lg font-bold text-green-700 dark:text-green-300">{c.powerGeneration} kW</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{c.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Energy Harvest Score — UNIQUE FEATURE */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Energy Harvest Score</span>
                        <span className={`text-sm font-bold ${color}`}>{label} · {c.energyScore}/100</span>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${bg}`}
                          style={{ width: `${c.energyScore}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                        {c.energyScore >= 80
                          ? '🌿 Ideal conditions — start wind turbines now'
                          : c.energyScore >= 60
                          ? '✅ Good energy generation conditions'
                          : c.energyScore >= 40
                          ? '⚠️ Marginal conditions — monitor closely'
                          : '❌ Suboptimal for wind energy generation'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend / How Energy Score Works */}
        {cities.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
            <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              How the Energy Harvest Score Works
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Wind Speed (55 pts)</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Optimal 10–14 m/s = 55 pts. Too slow or too fast reduces generation efficiency.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Atmospheric Pressure (25 pts)</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">High pressure (&gt;1020 hPa) means denser, more stable air for better turbine performance.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Humidity (20 pts)</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Lower humidity reduces air resistance and corrosion on turbine blades.</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default MonitorPage;
