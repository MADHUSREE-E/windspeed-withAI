const API_KEY = '1f17f795128639f79920cea6fe9dcfd4';

export interface WindData {
  city: string;
  windSpeed: number;
  gust: number;
  windDir: string;
  powerGeneration: number;
  energyScore: number;
  description: string;
  humidity: number;
  pressure: number;
  temperature: number;
  feelsLike: number;
  forecast?: ForecastPoint[];
}

export interface ForecastPoint {
  time: string;
  speed: number;
  power: number;
}

export interface BotResponse {
  text: string;
  suggestions: string[];
}

const degToDir = (deg: number): string => {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
};

const calcEnergyScore = (windSpeed: number, pressure: number, humidity: number): number => {
  let wScore = 0;
  if (windSpeed >= 10 && windSpeed <= 14) wScore = 55;
  else if (windSpeed >= 8 && windSpeed < 10) wScore = 45;
  else if (windSpeed >= 14 && windSpeed <= 18) wScore = 40;
  else if (windSpeed >= 6 && windSpeed < 8) wScore = 30;
  else if (windSpeed >= 4 && windSpeed < 6) wScore = 18;
  else if (windSpeed > 18) wScore = 20;
  else wScore = 8;

  let pScore = 0;
  if (pressure >= 1020) pScore = 25;
  else if (pressure >= 1013) pScore = 18;
  else if (pressure >= 1005) pScore = 12;
  else pScore = 5;

  let hScore = 0;
  if (humidity <= 40) hScore = 20;
  else if (humidity <= 60) hScore = 15;
  else if (humidity <= 75) hScore = 10;
  else hScore = 5;

  return Math.min(100, Math.round(wScore + pScore + hScore));
};

const getWindQuality = (speed: number): string => {
  if (speed < 3) return 'too low (below cut-in speed)';
  if (speed < 6) return 'low';
  if (speed < 8) return 'moderate';
  if (speed < 12) return 'optimal';
  if (speed < 15) return 'excellent';
  if (speed < 20) return 'strong';
  if (speed < 25) return 'very strong';
  return 'dangerously high';
};

const getEfficiency = (speed: number): number => {
  if (speed < 3) return 0;
  if (speed <= 12) return Math.round((speed / 12) * 100);
  if (speed <= 15) return 100;
  if (speed <= 25) return Math.round(100 - ((speed - 15) / 10) * 30);
  return 0;
};

const identifyIntent = (input: string): string => {
  const lower = input.toLowerCase();
  if (/should i (run|start|operate|turn on|use)|turbine.*(today|now)|run.*(today|now)|operate.*turbine/.test(lower)) return 'run_turbines';
  if (/best time|when.*optimal|peak.*hour|optimal.*time|when should|good time.*run|when.*run/.test(lower)) return 'best_time';
  if (/how much power|power output|kw|watt|generat.*power|current.*output/.test(lower)) return 'power_output';
  if (/effici|performance|how efficient/.test(lower)) return 'efficiency';
  if (/safe|danger|too (strong|high|fast)|shut down|stop.*turbine|emergency/.test(lower)) return 'safety';
  if (/forecast|tomorrow|tonight|later today|next (hour|day|few)|upcoming|predict/.test(lower)) return 'forecast';
  if (/mainten|repair|inspect|service|check.*turbine/.test(lower)) return 'maintenance';
  if (/wind (quality|condition|status|speed)|how.*wind|current.*wind|wind.*now/.test(lower)) return 'wind_quality';
  if (/energy|kwh|harvest|how much.*energy|total.*energy/.test(lower)) return 'energy';
  if (/hello|hi\b|hey|help|what can you|what do you/.test(lower)) return 'greeting';
  if (/temp|hot|cold|celsius/.test(lower)) return 'temperature';
  if (/humidity|pressure|weather condition/.test(lower)) return 'weather_conditions';
  if (/score|energy score|harvest score/.test(lower)) return 'energy_score';
  return 'general';
};

export const generateResponse = (input: string, data: WindData | null): BotResponse => {
  if (!data) {
    return {
      text: "I don't have wind data loaded yet. Please enter a city name below, or add cities in the Monitor page first — then I can give you real-time insights!",
      suggestions: ['What cities can you monitor?', 'How does wind power work?', 'What is cut-in speed?'],
    };
  }

  const intent = identifyIntent(input);
  const { windSpeed, gust, powerGeneration, energyScore, city, description, humidity, pressure, temperature, feelsLike, windDir, forecast } = data;
  const efficiency = getEfficiency(windSpeed);
  const windQuality = getWindQuality(windSpeed);

  const isTooHigh = windSpeed >= 25 || gust >= 28;
  const isOptimal = windSpeed >= 8 && windSpeed <= 15;
  const isTooLow = windSpeed < 3;
  const isGusty = gust > 20 && !isTooHigh;

  switch (intent) {
    case 'greeting':
      return {
        text: `Hello! I'm **WindBot**, your AI wind energy assistant.\n\nCurrently monitoring **${city}**:\n• Wind: **${windSpeed.toFixed(1)} m/s** (${windQuality})\n• Energy Score: **${energyScore}/100**\n• Power Output: **${powerGeneration.toFixed(1)} kW**\n\nAsk me anything about turbine operations, optimal timing, safety, or forecasts!`,
        suggestions: ['Should I run turbines?', 'Best time today?', 'Current power output?', 'Is it safe to operate?'],
      };

    case 'run_turbines':
      if (isTooHigh) {
        return {
          text: `🚨 **Do NOT operate turbines in ${city} right now!**\n\nWind: **${windSpeed.toFixed(1)} m/s** | Gusts: **${gust.toFixed(1)} m/s**\n\nWinds exceed the safe cut-out threshold of **25 m/s**. Engage emergency brakes immediately and wait for winds to drop below 20 m/s before restarting.`,
          suggestions: ['When will conditions improve?', 'Emergency shutdown steps?', 'Check forecast'],
        };
      }
      if (isTooLow) {
        return {
          text: `❌ **Not recommended to run turbines in ${city} right now.**\n\nWind speed is only **${windSpeed.toFixed(1)} m/s** — below the minimum cut-in speed of **3 m/s**. Turbines won't generate meaningful power.\n\nCheck the forecast for a better operational window.`,
          suggestions: ['Best time today?', 'What is cut-in speed?', 'Check forecast'],
        };
      }
      if (isOptimal) {
        return {
          text: `✅ **Yes! Run turbines at full capacity in ${city}!**\n\nWind: **${windSpeed.toFixed(1)} m/s** | Efficiency: **${efficiency}%**\nPower Output: **${powerGeneration.toFixed(1)} kW** | Energy Score: **${energyScore}/100**\n\nConditions are optimal. Maximize energy harvest now — this is exactly the window you want!`,
          suggestions: ['How much energy will I generate?', 'How long will this last?', 'Safety check?'],
        };
      }
      return {
        text: `✅ **Yes, turbines can operate in ${city}**, though not at peak efficiency.\n\nWind: **${windSpeed.toFixed(1)} m/s** (${windQuality}) | Efficiency: **${efficiency}%**\nPower Output: **${powerGeneration.toFixed(1)} kW**\n\n${isGusty ? '⚠️ Note: High gusts detected — monitor turbine vibration.' : 'Conditions are stable for normal operations.'}`,
        suggestions: ['Best time today?', 'Current energy score?', 'Safety check?'],
      };

    case 'best_time':
      if (forecast && forecast.length > 0) {
        const optimalWindows = forecast.filter(f => f.speed >= 8 && f.speed <= 15);
        if (optimalWindows.length > 0) {
          const firstOptimal = optimalWindows[0];
          const lastOptimal = optimalWindows[optimalWindows.length - 1];
          const avgSpeed = optimalWindows.reduce((s, f) => s + f.speed, 0) / optimalWindows.length;
          const maxPower = Math.max(...optimalWindows.map(f => f.power));
          const window = firstOptimal.time === lastOptimal.time
            ? firstOptimal.time
            : `${firstOptimal.time} – ${lastOptimal.time}`;
          return {
            text: `🕐 **Best operating window for ${city}:**\n\n**${window}**\nAverage wind: **${avgSpeed.toFixed(1)} m/s** | Peak power: **${maxPower.toFixed(1)} kW**\n\nSchedule your turbines during this window for maximum energy harvest. ${isOptimal ? 'Conditions are already optimal right now!' : 'Current conditions are outside this peak window.'}`,
            suggestions: ['Should I run turbines now?', 'Expected energy output?', 'Safety check?'],
          };
        }
        const bestHour = forecast.reduce((best, f) => f.speed > best.speed ? f : best, forecast[0]);
        return {
          text: `📊 **No fully optimal windows today for ${city}**, but the best time is:\n\n**${bestHour.time}** — Wind: **${bestHour.speed.toFixed(1)} m/s** | Power: **${bestHour.power.toFixed(1)} kW**\n\nToday's winds are below ideal (8-15 m/s). Consider partial operation during this window.`,
          suggestions: ['What wind speed is optimal?', 'Should I run turbines now?', 'Efficiency details?'],
        };
      }
      return {
        text: `Based on current conditions in **${city}**, wind is **${windQuality}** at **${windSpeed.toFixed(1)} m/s**.\n\nFor detailed hourly forecasts and optimal timing, visit the **Prediction page** — it shows 24-hour wind charts.\n\nOptimal turbine range: **8-15 m/s** | You're currently at **${efficiency}%** efficiency.`,
        suggestions: ['Should I run turbines now?', 'Current power output?', 'Energy score?'],
      };

    case 'power_output':
      return {
        text: `⚡ **Current power generation in ${city}:**\n\nPower Output: **${powerGeneration.toFixed(1)} kW**\nWind Speed: **${windSpeed.toFixed(1)} m/s** | Efficiency: **${efficiency}%**\n\n${isOptimal ? '🌿 Near peak output! Wind is in the optimal range.' : isTooLow ? '📉 Output is minimal. Wind is below cut-in speed.' : isTooHigh ? '⚠️ High wind — consider reducing load for safety.' : '📊 Generating power, but not at peak. Optimal is 8-15 m/s.'}`,
        suggestions: ['Energy score?', 'Should I run turbines?', 'Best time for max power?'],
      };

    case 'efficiency':
      return {
        text: `📊 **Turbine efficiency in ${city}: ${efficiency}%**\n\nWind Speed: **${windSpeed.toFixed(1)} m/s** | Energy Score: **${energyScore}/100**\n\n${efficiency >= 85 ? '✅ Excellent — you are near peak Betz efficiency.' : efficiency >= 60 ? '📈 Good efficiency. Conditions are favorable for operation.' : efficiency >= 30 ? '⚠️ Moderate efficiency. Not ideal but turbines are viable.' : '❌ Low efficiency. Wind is outside optimal range (8-15 m/s).'}\n\nTip: Optimal efficiency occurs between **8-15 m/s**.`,
        suggestions: ['How to improve efficiency?', 'Best time today?', 'Current power output?'],
      };

    case 'safety':
      if (isTooHigh) {
        return {
          text: `🚨 **DANGER — Unsafe conditions in ${city}!**\n\nWind: **${windSpeed.toFixed(1)} m/s** | Gusts: **${gust.toFixed(1)} m/s**\n\n**Immediate actions:**\n• Engage emergency brakes\n• Pitch blades to feathered position\n• Secure all turbine hatches\n• Evacuate nacelle — no personnel aloft\n\nWait for sustained winds below **20 m/s** before restart.`,
          suggestions: ['When will conditions improve?', 'Check forecast', 'Monitor alerts'],
        };
      }
      if (isGusty) {
        return {
          text: `⚠️ **Caution — High gusts in ${city}.**\n\nWind: **${windSpeed.toFixed(1)} m/s** | Gusts: **${gust.toFixed(1)} m/s** ← Elevated!\n\nTurbines can operate, but:\n• Avoid maintenance work at height\n• Monitor vibration sensors\n• Keep personnel away from tower base\n• Safety margin to cut-out: **${(28 - gust).toFixed(1)} m/s**`,
          suggestions: ['Should I reduce turbine speed?', 'Check forecast', 'Power output now?'],
        };
      }
      return {
        text: `✅ **Safe operating conditions in ${city}.**\n\nWind: **${windSpeed.toFixed(1)} m/s** | Gusts: **${gust.toFixed(1)} m/s**\n\nAll within safe limits:\n• Cut-in speed (3 m/s): ✓\n• Cut-out speed (25 m/s): ✓\n• Gust safety margin: **${(28 - gust).toFixed(1)} m/s** buffer remaining\n\n${isTooLow ? "Note: Wind is below cut-in speed — turbines won't spin." : 'Green light for normal operations.'}`,
        suggestions: ['Run turbines?', 'Power output?', 'Maintenance window?'],
      };

    case 'forecast':
      if (forecast && forecast.length > 0) {
        const next4 = forecast.slice(0, 4);
        const lines = next4.map(f => {
          const q = f.speed >= 8 && f.speed <= 15 ? '✅' : f.speed < 3 ? '❌' : f.speed >= 25 ? '🚨' : '📊';
          return `${q} **${f.time}**: ${f.speed.toFixed(1)} m/s → ${f.power.toFixed(1)} kW`;
        }).join('\n');
        const trend = forecast[forecast.length - 1].speed > windSpeed ? 'increasing' : 'decreasing';
        return {
          text: `📅 **Upcoming forecast for ${city}:**\n\n${lines}\n\nWind is **${trend}** over the forecast period. ${trend === 'increasing' ? 'Plan for higher output later today.' : 'Maximize generation while current conditions last.'}`,
          suggestions: ['Best time today?', 'Should I run turbines now?', 'Safety check?'],
        };
      }
      return {
        text: `Detailed forecast isn't loaded for **${city}** in the chat. Visit the **Prediction page** for full 24-hour wind speed charts and scheduling tools.\n\nCurrently: **${windSpeed.toFixed(1)} m/s** (${windQuality})`,
        suggestions: ['Current conditions?', 'Should I run turbines now?', 'Power output?'],
      };

    case 'maintenance':
      if (windSpeed < 5) {
        return {
          text: `🔧 **Now is a good time for maintenance in ${city}!**\n\nWind: **${windSpeed.toFixed(1)} m/s** — Low and safe for access.\n\n**Recommended tasks:**\n• Blade inspection and surface cleaning\n• Gearbox and bearing lubrication\n• Electrical connection checks\n• Yaw system calibration\n• Brake pad inspection\n\nSchedule work soon before winds pick up.`,
          suggestions: ['When does wind pick up?', 'Check forecast', 'Current energy score?'],
        };
      }
      return {
        text: `⚠️ **Not ideal for maintenance in ${city} right now.**\n\nWind: **${windSpeed.toFixed(1)} m/s** (${windQuality}) — too strong for safe turbine access.\n\nSchedule maintenance when winds drop below **5 m/s**.\n\nEnergy score is **${energyScore}/100** — better to harvest energy now and plan maintenance for a low-wind window.`,
        suggestions: ['Best maintenance window?', 'Check forecast', 'Current power output?'],
      };

    case 'wind_quality':
      return {
        text: `💨 **Wind conditions in ${city}:**\n\nSpeed: **${windSpeed.toFixed(1)} m/s** (${windQuality})\nDirection: **${windDir}** | Gusts: **${gust.toFixed(1)} m/s**\nEnergy Score: **${energyScore}/100**\nDescription: ${description.charAt(0).toUpperCase() + description.slice(1)}\n\n${isOptimal ? '🌿 Optimal for energy generation!' : isTooLow ? '❌ Below cut-in speed — turbines cannot operate.' : isTooHigh ? '🚨 Dangerously high — engage cut-out protocol.' : '📊 Operational range — not at peak efficiency.'}`,
        suggestions: ['Should I run turbines?', 'Power output?', 'Best time today?'],
      };

    case 'energy':
      return {
        text: `🌿 **Energy generation estimate for ${city}:**\n\nCurrent Output: **${powerGeneration.toFixed(1)} kW**\nProjected (1 hour): **~${powerGeneration.toFixed(1)} kWh**\nProjected (6 hours): **~${(powerGeneration * 6).toFixed(1)} kWh**\nProjected (24 hours): **~${(powerGeneration * 24).toFixed(1)} kWh**\nEnergy Harvest Score: **${energyScore}/100**\n\n${energyScore >= 65 ? '⚡ High harvest opportunity! Run turbines at full capacity.' : energyScore >= 40 ? '📊 Moderate harvest. Consider partial operation.' : '📉 Low harvest conditions. Not cost-effective to run at full capacity.'}`,
        suggestions: ['Power output details?', 'Best harvest window?', 'Should I run turbines?'],
      };

    case 'energy_score':
      return {
        text: `📊 **Energy Harvest Score for ${city}: ${energyScore}/100**\n\nBreakdown:\n• Wind speed (**${windSpeed.toFixed(1)} m/s**): primary factor\n• Pressure (**${pressure} hPa**): air density contribution\n• Humidity (**${humidity}%**): air resistance factor\n\n${energyScore >= 80 ? '🟢 Excellent — all factors aligned for maximum harvest.' : energyScore >= 60 ? '🔵 Good — favorable conditions for energy generation.' : energyScore >= 40 ? '🟡 Fair — some factors limiting output.' : '🔴 Poor — conditions are not ideal for wind energy.'}`,
        suggestions: ['Should I run turbines?', 'Power output?', 'How to improve score?'],
      };

    case 'temperature':
      return {
        text: `🌡️ **Temperature conditions in ${city}:**\n\nTemperature: **${temperature.toFixed(1)}°C** | Feels Like: **${feelsLike.toFixed(1)}°C**\n\n${temperature < -10 ? '🧊 Extreme cold — activate blade de-icing systems. Check antifreeze in gearbox.' : temperature < 0 ? '❄️ Freezing — monitor for ice formation on blades. Ensure lubricants are cold-rated.' : temperature < 10 ? '🌬️ Cold — standard cold-weather operations. Monitor vibration.' : temperature > 40 ? '🔥 Extreme heat — monitor nacelle cooling systems closely.' : temperature > 35 ? '☀️ High heat — check cooling systems and thermal sensors.' : '✅ Temperature is within normal operating range.'}\n\nWind: **${windSpeed.toFixed(1)} m/s** | Humidity: **${humidity}%**`,
        suggestions: ['Wind conditions?', 'Should I run turbines?', 'Safety check?'],
      };

    case 'weather_conditions':
      return {
        text: `🌤️ **Full conditions in ${city}:**\n\nWind: **${windSpeed.toFixed(1)} m/s** ${windDir} | Gusts: **${gust.toFixed(1)} m/s**\nTemperature: **${temperature.toFixed(1)}°C** (feels ${feelsLike.toFixed(1)}°C)\nHumidity: **${humidity}%** | Pressure: **${pressure} hPa**\nWeather: ${description.charAt(0).toUpperCase() + description.slice(1)}\n\n${pressure > 1020 ? '📈 High pressure — stable, consistent wind expected.' : pressure < 1000 ? '📉 Low pressure — variable winds, monitor closely.' : '📊 Normal pressure — steady conditions.'}`,
        suggestions: ['Should I run turbines?', 'Power output?', 'Safety check?'],
      };

    default:
      return {
        text: `I'm analyzing **${city}** right now:\n\nWind: **${windSpeed.toFixed(1)} m/s** (${windQuality}) | Score: **${energyScore}/100**\n\nCould you be more specific? I can help with:\n• Turbine operation decisions\n• Optimal timing & scheduling\n• Power output & efficiency\n• Safety assessments\n• Maintenance windows\n• Energy forecasts`,
        suggestions: ['Should I run turbines?', 'Best time today?', 'Current power output?', 'Is it safe?'],
      };
  }
};

export const fetchWindData = async (city: string): Promise<WindData | null> => {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
    );
    if (!res.ok) return null;
    const d = await res.json();

    const windSpeed = d.wind?.speed ?? 0;
    const gust = d.wind?.gust ?? windSpeed * 1.3;
    const powerGeneration = windSpeed * windSpeed * 0.5;
    const humidity = d.main?.humidity ?? 0;
    const pressure = d.main?.pressure ?? 1013;
    const energyScore = calcEnergyScore(windSpeed, pressure, humidity);

    return {
      city: d.name,
      windSpeed,
      gust,
      windDir: degToDir(d.wind?.deg ?? 0),
      powerGeneration,
      energyScore,
      description: d.weather?.[0]?.description ?? '',
      humidity,
      pressure,
      temperature: d.main?.temp ?? 0,
      feelsLike: d.main?.feels_like ?? 0,
    };
  } catch {
    return null;
  }
};

export const fetchWindDataWithForecast = async (city: string): Promise<WindData | null> => {
  const base = await fetchWindData(city);
  if (!base) return null;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&cnt=8`
    );
    if (!res.ok) return base;
    const d = await res.json();

    const forecast: ForecastPoint[] = (d.list ?? []).map((item: { dt_txt: string; wind: { speed: number }; }) => {
      const speed = item.wind?.speed ?? 0;
      const timeLabel = new Date(item.dt_txt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { time: timeLabel, speed, power: speed * speed * 0.5 };
    });

    return { ...base, forecast };
  } catch {
    return base;
  }
};
