import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";

const databasePath = fileURLToPath(new URL("../weather.db", import.meta.url));
const database = new Database(databasePath);

// Insert a weather observation using the existing weather_logs schema.
export function insertWeatherLog(weather) {
  const insert = database.prepare(`
    INSERT INTO weather_logs (
      city, country, latitude, longitude, temperature_c,
      humidity, wind_kmh, condition, weather_code
    ) VALUES (
      @city, @country, @latitude, @longitude, @temperature_c,
      @humidity, @wind_kmh, @condition, @weather_code
    )
  `);

  return insert.run(weather);
}

// Return the newest weather observations up to the supplied row limit.
export function listWeatherLogs(limit) {
  return database.prepare(`
    SELECT id, city, country, latitude, longitude, temperature_c,
           humidity, wind_kmh, condition, weather_code, created_at
    FROM weather_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit);
}

// Calculate temperature summaries and the observation count for a city.
export function getCityStats(city) {
  return database.prepare(`
    SELECT MIN(temperature_c) AS min_temperature_c,
           MAX(temperature_c) AS max_temperature_c,
           AVG(temperature_c) AS average_temperature_c,
           COUNT(*) AS log_count
    FROM weather_logs
    WHERE city = ? COLLATE NOCASE
  `).get(city);
}
