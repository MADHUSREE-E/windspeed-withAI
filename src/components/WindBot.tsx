import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Wind, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { generateResponse, fetchWindDataWithForecast, WindData } from '../services/windBotService';

interface Message {
  id: number;
  role: 'bot' | 'user';
  text: string;
  suggestions?: string[];
}

let nextId = 1;

const WELCOME: Message = {
  id: nextId++,
  role: 'bot',
  text: "👋 Hi! I'm **WindBot**, your AI wind energy assistant.\n\nType a city name in the search bar above and press Enter to load live wind data. Then ask me anything — like:\n• *\"Should I run the turbines today?\"*\n• *\"What's the best time for peak power?\"*\n• *\"Is it safe to operate?\"*",
  suggestions: ['Should I run turbines?', 'Best time today?', 'Current power output?', 'Is it safe to operate?'],
};

/** Render **bold** markdown in a text string */
const RichText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : <span key={j}>{part}</span>
      );
      return <p key={i} className={i > 0 ? 'mt-1' : ''}>{parts}</p>;
    })}
  </>
);

const WindBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [loadingCity, setLoadingCity] = useState(false);
  const [cityError, setCityError] = useState('');
  const [typing, setTyping] = useState(false);

  // Use a ref so sendMessage always reads the latest windData without stale closure
  const windDataRef = useRef<WindData | null>(null);
  const [windData, _setWindData] = useState<WindData | null>(null);
  const setWindData = (d: WindData | null) => {
    windDataRef.current = d;
    _setWindData(d);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef(''); // mirror of input state for use in callbacks

  // Keep input ref in sync
  useEffect(() => { inputRef2.current = input; }, [input]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [messages, open, minimized]);

  // Focus input when opened
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, minimized]);

  // Auto-load first city from Monitor page (stored as string[])
  useEffect(() => {
    try {
      const stored = localStorage.getItem('windcast_monitor_cities');
      if (stored) {
        const cities: string[] = JSON.parse(stored);
        if (Array.isArray(cities) && cities.length > 0 && typeof cities[0] === 'string') {
          loadCity(cities[0]);
        }
      }
    } catch {
      // no stored cities — that's fine
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushMessage = (msg: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: nextId++ }]);
  };

  const loadCity = async (city: string) => {
    const trimmed = city.trim();
    if (!trimmed) return;
    setLoadingCity(true);
    setCityError('');
    const data = await fetchWindDataWithForecast(trimmed);
    setLoadingCity(false);

    if (!data) {
      setCityError(`City "${trimmed}" not found. Check spelling and try again.`);
      return;
    }

    setWindData(data);
    setCityInput(data.city);

    const eff = data.windSpeed <= 3 ? 0
      : data.windSpeed <= 12 ? Math.round((data.windSpeed / 12) * 100)
      : data.windSpeed <= 15 ? 100
      : Math.max(0, Math.round(100 - ((data.windSpeed - 15) / 10) * 30));

    const statusIcon = data.windSpeed >= 8 && data.windSpeed <= 15 ? '✅'
      : data.windSpeed < 3 ? '❌'
      : data.windSpeed >= 25 ? '🚨'
      : '📊';
    const statusText = data.windSpeed >= 8 && data.windSpeed <= 15 ? 'Optimal for turbine operation!'
      : data.windSpeed < 3 ? 'Below cut-in speed — turbines idle.'
      : data.windSpeed >= 25 ? 'Dangerous! Cut-out speed exceeded.'
      : 'Operational, not at peak efficiency.';

    pushMessage({
      role: 'bot',
      text: `📍 **${data.city}** loaded with live data!\n\n• Wind: **${data.windSpeed.toFixed(1)} m/s** (${data.windDir}) | Gusts: **${data.gust.toFixed(1)} m/s**\n• Power: **${data.powerGeneration.toFixed(1)} kW** | Efficiency: **${eff}%**\n• Energy Score: **${data.energyScore}/100**\n• Temp: **${data.temperature.toFixed(1)}°C** | Humidity: **${data.humidity}%**\n\n${statusIcon} ${statusText}`,
      suggestions: ['Should I run turbines?', 'Best time today?', 'Show forecast', 'Safety check?'],
    });
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    pushMessage({ role: 'user', text: trimmed });
    setInput('');
    inputRef2.current = '';
    setTyping(true);

    // Simulate thinking delay
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));

    // Always read latest windData from ref — avoids stale closure
    const response = generateResponse(trimmed, windDataRef.current);
    setTyping(false);
    pushMessage({ role: 'bot', text: response.text, suggestions: response.suggestions });
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadCity(cityInput);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputRef2.current);
    }
  };

  // ── Floating button (closed state) ───────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-full shadow-xl px-4 py-3 transition-all duration-200 hover:scale-105 active:scale-95"
        title="Open WindBot AI Assistant"
      >
        <Wind size={20} />
        <span className="font-semibold text-sm">WindBot</span>
        <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
      </button>
    );
  }

  // ── Chat window ──────────────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
      style={{ width: 370 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Wind size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">WindBot</p>
            <p className="text-emerald-100 text-xs mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse inline-block" />
              {windData ? `Monitoring ${windData.city}` : 'AI Wind Assistant'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(m => !m)}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${minimized ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {minimized ? (
        <div className="bg-white dark:bg-gray-900 px-4 py-2">
          <p className="text-xs text-gray-400 text-center">Click ▲ to expand</p>
        </div>
      ) : (
        <>
          {/* City search */}
          <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex-shrink-0">
            <form onSubmit={handleCitySubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={cityInput}
                  onChange={e => { setCityInput(e.target.value); setCityError(''); }}
                  placeholder="Enter city (e.g. Chicago, London…)"
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-8"
                />
                {loadingCity && (
                  <RefreshCw size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-emerald-500" />
                )}
              </div>
              <button
                type="submit"
                disabled={loadingCity || !cityInput.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 transition-colors"
              >
                <Search size={14} />
              </button>
            </form>
            {cityError && <p className="text-red-500 text-xs mt-1">{cityError}</p>}
          </div>

          {/* Live data strip */}
          {windData && (
            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/30 dark:to-cyan-900/30 border-b border-emerald-100 dark:border-emerald-800 px-3 py-1.5 flex items-center gap-3 text-xs flex-shrink-0">
              <span className="text-gray-700 dark:text-gray-300">
                <Wind size={11} className="inline mr-1 text-emerald-500" />
                <strong>{windData.windSpeed.toFixed(1)} m/s</strong>
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                ⚡ <strong>{windData.powerGeneration.toFixed(1)} kW</strong>
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                Score:{' '}
                <strong className={windData.energyScore >= 60 ? 'text-emerald-600 dark:text-emerald-400' : windData.energyScore >= 40 ? 'text-yellow-600' : 'text-red-500'}>
                  {windData.energyScore}/100
                </strong>
              </span>
              <button
                onClick={() => loadCity(windData.city)}
                className="ml-auto text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                title="Refresh"
              >
                <RefreshCw size={11} />
              </button>
            </div>
          )}

          {/* Messages */}
          <div
            className="overflow-y-auto bg-white dark:bg-gray-900 px-3 py-3 space-y-3"
            style={{ minHeight: 220, maxHeight: 320 }}
          >
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={msg.role === 'user' ? 'max-w-[85%]' : 'w-full'}>
                  {msg.role === 'bot' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                        <Wind size={10} className="text-white" />
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">WindBot</span>
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
                      msg.role === 'user'
                        ? 'bg-emerald-500 text-white rounded-tr-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                    }`}
                  >
                    <RichText text={msg.text} />
                  </div>
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(s)}
                          disabled={typing}
                          className="text-xs bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-800/60 disabled:opacity-50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 rounded-full px-2.5 py-1 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                  <Wind size={10} className="text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-3 py-2.5 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={typing}
              placeholder={windData ? `Ask about ${windData.city}…` : 'Load a city first, then ask…'}
              className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || typing}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-40 text-white rounded-xl px-3 py-2 transition-all active:scale-95"
            >
              <Send size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default WindBot;
