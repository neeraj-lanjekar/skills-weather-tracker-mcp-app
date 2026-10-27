const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// Fetch JSON from Open-Meteo and report HTTP or network failures clearly.
async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error("Open-Meteo request timed out. Please try again.");
    }
    throw new Error("Could not reach Open-Meteo. Check your network and try again.");
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo returned HTTP ${response.status}. Please try again later.`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Open-Meteo returned an invalid JSON response.");
  }
}

// Resolve a city name to its first matching Open-Meteo location.
export async function geocodeCity(city) {
  const url = new URL(GEOCODING_URL);
  url.search = new URLSearchParams({ name: city, count: "1" });
  const data = await fetchJson(url);
  const location = data.results?.[0];

  if (!location) {
    throw new Error(`No location found for "${city}". Check the spelling and try again.`);
  }
  if (
    typeof location.name !== "string" ||
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  ) {
    throw new Error("Open-Meteo returned incomplete location data.");
  }

  return location;
}

// Map WMO weather interpretation codes to concise readable conditions.
export function describeWeatherCode(code) {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "rain";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorm";
  return "unknown";
}

// Fetch and normalize current conditions for a resolved location.
export async function fetchCurrentWeather(location) {
  const url = new URL(FORECAST_URL);
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
  });
  const data = await fetchJson(url);
  const current = data.current;

  if (
    !current ||
    typeof current.temperature_2m !== "number" ||
    typeof current.relative_humidity_2m !== "number" ||
    typeof current.wind_speed_10m !== "number" ||
    !Number.isInteger(current.relative_humidity_2m) ||
    !Number.isInteger(current.weather_code)
  ) {
    throw new Error("Open-Meteo returned incomplete current-weather data.");
  }

  const units = data.current_units;
  if (units?.temperature_2m !== "°C" || units?.relative_humidity_2m !== "%" || units?.wind_speed_10m !== "km/h") {
    throw new Error("Open-Meteo returned unexpected current-weather units.");
  }

  return {
    city: location.name,
    country: location.country ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
    temperature_c: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    wind_kmh: current.wind_speed_10m,
    condition: describeWeatherCode(current.weather_code),
    weather_code: current.weather_code,
  };
}
