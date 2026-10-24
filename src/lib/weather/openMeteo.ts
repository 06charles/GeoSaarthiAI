import { Coordinates, WeatherData, HourlyCondition } from "@/types/recommendation";

const weatherCache = new Map<string, { timestamp: number; data: WeatherData }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 mins

export function getWeatherDescription(code: number): string {
  switch (code) {
    case 0:
      return "Clear skies";
    case 1:
      return "Mainly clear";
    case 2:
      return "Partly cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Foggy & mist";
    case 51:
    case 53:
    case 55:
      return "Light drizzle";
    case 61:
    case 63:
    case 65:
      return "Rain showers";
    case 71:
    case 73:
    case 75:
      return "Snowfall";
    case 80:
    case 81:
    case 82:
      return "Heavy rain showers";
    case 95:
    case 96:
    case 99:
      return "Thunderstorm";
    default:
      return "Pleasant / Fair";
  }
}

export async function fetchWeatherData(coords: Coordinates): Promise<WeatherData> {
  const cacheKey = `${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index&timezone=Asia%2FKolkata&forecast_days=2`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const current = json.current;
      const hourly = json.hourly;

      const hourlyList: HourlyCondition[] = [];
      const times = hourly.time || [];
      const now = new Date();

      for (let i = 0; i < Math.min(times.length, 36); i++) {
        const itemDate = new Date(times[i]);
        hourlyList.push({
          time: times[i],
          hour: itemDate.getHours(),
          tempC: Math.round(hourly.temperature_2m[i] * 10) / 10,
          feelsLikeC: Math.round(hourly.apparent_temperature[i] * 10) / 10,
          precipitationMm: hourly.precipitation[i] ?? 0,
          rainProbabilityPct: hourly.precipitation_probability[i] ?? 0,
          windSpeedKmh: Math.round(hourly.wind_speed_10m[i] * 10) / 10,
          humidityPct: hourly.relative_humidity_2m[i] ?? 0,
          uvIndex: hourly.uv_index[i] ?? 0,
        });
      }

      const weatherResult: WeatherData = {
        source: "Open-Meteo Weather API (ECMWF & GFS)",
        timestamp: new Date().toISOString(),
        current: {
          tempC: Math.round(current.temperature_2m * 10) / 10,
          feelsLikeC: Math.round(current.apparent_temperature * 10) / 10,
          precipitationMm: current.precipitation ?? 0,
          rainProbabilityPct: hourlyList[0]?.rainProbabilityPct ?? 0,
          windSpeedKmh: Math.round(current.wind_speed_10m * 10) / 10,
          humidityPct: current.relative_humidity_2m ?? 0,
          uvIndex: hourlyList[0]?.uvIndex ?? 0,
          weatherCode: current.weather_code,
          weatherDescription: getWeatherDescription(current.weather_code),
          isDay: current.is_day === 1,
        },
        hourly: hourlyList,
      };

      weatherCache.set(cacheKey, { timestamp: Date.now(), data: weatherResult });
      return weatherResult;
    }
  } catch (err) {
    console.warn("Open-Meteo weather API call failed, using seasonal estimate fallback:", err);
  }

  // Fallback seasonal estimates for coastal Mumbai if Open-Meteo is temporarily unreachable
  const defaultCurrent = {
    tempC: 30.5,
    feelsLikeC: 33.2,
    precipitationMm: 0,
    rainProbabilityPct: 10,
    windSpeedKmh: 14.5,
    humidityPct: 68,
    uvIndex: 5,
    weatherCode: 1,
    weatherDescription: "Mainly clear (Offline estimate)",
    isDay: true,
  };

  const defaultHourly: HourlyCondition[] = [];
  const startHour = new Date().getHours();
  for (let i = 0; i < 24; i++) {
    const h = (startHour + i) % 24;
    const isMidday = h >= 11 && h <= 15;
    const isNight = h >= 22 || h <= 5;
    const temp = isMidday ? 33 : isNight ? 26 : 29;
    defaultHourly.push({
      time: new Date(Date.now() + i * 3600000).toISOString(),
      hour: h,
      tempC: temp,
      feelsLikeC: temp + 2,
      precipitationMm: 0,
      rainProbabilityPct: 10,
      windSpeedKmh: 12,
      humidityPct: 70,
      uvIndex: isMidday ? 7 : isNight ? 0 : 3,
    });
  }

  return {
    source: "Estimated Mumbai Microclimate Baseline (Network offline fallback)",
    timestamp: new Date().toISOString(),
    current: defaultCurrent,
    hourly: defaultHourly,
  };
}
