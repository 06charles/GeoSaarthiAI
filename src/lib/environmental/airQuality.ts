import { Coordinates, AirQualityData } from "@/types/recommendation";

const aqiCache = new Map<string, { timestamp: number; data: AirQualityData }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 mins

export function calculateIndianAqi(pm25: number): {
  aqi: number;
  category: "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";
} {
  let aqi: number;
  let category: "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";

  if (pm25 <= 30) {
    aqi = Math.round((50 / 30) * pm25);
    category = "Good";
  } else if (pm25 <= 60) {
    aqi = Math.round(50 + ((100 - 50) / (60 - 30)) * (pm25 - 30));
    category = "Satisfactory";
  } else if (pm25 <= 90) {
    aqi = Math.round(100 + ((200 - 100) / (90 - 60)) * (pm25 - 60));
    category = "Moderate";
  } else if (pm25 <= 120) {
    aqi = Math.round(200 + ((300 - 200) / (120 - 90)) * (pm25 - 90));
    category = "Poor";
  } else if (pm25 <= 250) {
    aqi = Math.round(300 + ((400 - 300) / (250 - 120)) * (pm25 - 120));
    category = "Very Poor";
  } else {
    aqi = Math.round(400 + ((500 - 400) / (380 - 250)) * (pm25 - 250));
    category = "Severe";
  }

  return { aqi: Math.min(500, Math.max(0, aqi)), category };
}

export function getAqiCategory(
  usAqi: number
): "Good" | "Moderate" | "Unhealthy for Sensitive Groups" | "Unhealthy" | "Very Unhealthy" | "Hazardous" {
  if (usAqi <= 50) return "Good";
  if (usAqi <= 100) return "Moderate";
  if (usAqi <= 150) return "Unhealthy for Sensitive Groups";
  if (usAqi <= 200) return "Unhealthy";
  if (usAqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export async function fetchAirQualityData(coords: Coordinates): Promise<AirQualityData> {
  const cacheKey = `${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`;
  const cached = aqiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lng}&current=european_aqi,us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide&hourly=pm10,pm2_5,european_aqi,us_aqi&timezone=Asia%2FKolkata&forecast_days=2`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const current = json.current;
      const hourly = json.hourly;

      const hourlyList: { time: string; europeanAqi: number; pm25: number; pm10: number }[] = [];
      const times = hourly.time || [];

      for (let i = 0; i < Math.min(times.length, 36); i++) {
        hourlyList.push({
          time: times[i],
          europeanAqi: hourly.european_aqi ? hourly.european_aqi[i] : 45,
          pm25: hourly.pm2_5 ? Math.round(hourly.pm2_5[i]) : 35,
          pm10: hourly.pm10 ? Math.round(hourly.pm10[i]) : 65,
        });
      }

      const usAqi = current.us_aqi ? Math.round(current.us_aqi) : 75;
      const pm25 = current.pm2_5 ? Math.round(current.pm2_5 * 10) / 10 : 38.5;
      const pm10 = current.pm10 ? Math.round(current.pm10 * 10) / 10 : 72.0;

      const indianCalc = calculateIndianAqi(pm25);

      const aqiResult: AirQualityData = {
        source: "Open-Meteo Air Quality (Copernicus CAMS & GFS)",
        timestamp: new Date().toISOString(),
        current: {
          europeanAqi: current.european_aqi ? Math.round(current.european_aqi) : 48,
          usAqi,
          indianAqi: indianCalc.aqi,
          indianCategory: indianCalc.category,
          pm25,
          pm10,
          nitrogenDioxide: current.nitrogen_dioxide ? Math.round(current.nitrogen_dioxide) : undefined,
          ozone: current.ozone ? Math.round(current.ozone) : undefined,
          sulphurDioxide: current.sulphur_dioxide ? Math.round(current.sulphur_dioxide) : undefined,
          aqiCategory: getAqiCategory(usAqi),
        },
        hourly: hourlyList,
      };

      aqiCache.set(cacheKey, { timestamp: Date.now(), data: aqiResult });
      return aqiResult;
    }
  } catch (err) {
    console.warn("Open-Meteo Air Quality API request failed, using baseline model:", err);
  }

  // Graceful fallback baseline for Mumbai
  const fallbackAqi: AirQualityData = {
    source: "Estimated Mumbai CPCB Baseline Proxy (Live API unavailable)",
    timestamp: new Date().toISOString(),
    current: {
      europeanAqi: 52,
      usAqi: 88,
      indianAqi: 120,
      indianCategory: "Moderate",
      pm25: 42.0,
      pm10: 78.0,
      aqiCategory: "Moderate",
    },
    hourly: Array.from({ length: 24 }).map((_, i) => ({
      time: new Date(Date.now() + i * 3600000).toISOString(),
      europeanAqi: 50,
      pm25: 40,
      pm10: 75,
    })),
  };

  return fallbackAqi;
}
