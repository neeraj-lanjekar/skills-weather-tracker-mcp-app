import {
  getCityStats,
  insertWeatherLog,
  listWeatherLogs,
} from "./db.js";
import { fetchCurrentWeather, geocodeCity } from "./weather.js";

// Format a cell to its table-column width.
function cell(value, width) {
  const text = String(value ?? "");
  return text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width);
}

// Print the selected logs as a compact, aligned table.
function printLogs(logs) {
  if (logs.length === 0) {
    console.log("No weather logs found.");
    return;
  }

  const columns = [
    ["ID", "id", 5],
    ["City", "city", 18],
    ["Country", "country", 16],
    ["Temp °C", "temperature_c", 9],
    ["Humidity %", "humidity", 11],
    ["Wind km/h", "wind_kmh", 10],
    ["Condition", "condition", 14],
    ["Created at", "created_at", 19],
  ];
  const row = (values) => `| ${values.map((value, i) => cell(value, columns[i][2])).join(" | ")} |`;
  const divider = `+-${columns.map(([, , width]) => "-".repeat(width)).join("-+-")}-+`;

  console.log(divider);
  console.log(row(columns.map(([title]) => title)));
  console.log(divider);
  for (const log of logs) {
    console.log(row(columns.map(([title, key]) => {
      const value = log[key];
      return typeof value === "number" && (title === "Temp °C" || title === "Wind km/h")
        ? value.toFixed(1)
        : value;
    })));
  }
  console.log(divider);
}

// Add the latest observation for a city and report the inserted values.
async function addCity(city) {
  if (!city?.trim()) {
    throw new Error('Usage: node src/cli.js add "<city>"');
  }
  const location = await geocodeCity(city.trim());
  const weather = await fetchCurrentWeather(location);
  insertWeatherLog(weather);
  console.log(
    `Added ${weather.city}, ${weather.country ?? "unknown country"}: ` +
    `${weather.temperature_c} °C, ${weather.condition} ` +
    `(humidity ${weather.humidity}%, wind ${weather.wind_kmh} km/h).`,
  );
}

// Validate and return an optional positive integer row limit.
function parseListLimit(args) {
  if (args.length === 0) return 10;
  if (args.length !== 2 || args[0] !== "--limit") {
    throw new Error("Usage: node src/cli.js list [--limit N]");
  }

  const limit = Number(args[1]);
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("--limit must be a positive whole number.");
  }
  return limit;
}

// Print statistics for one city, including an explicit empty-result message.
function printStats(city) {
  if (!city?.trim()) {
    throw new Error('Usage: node src/cli.js stats "<city>"');
  }
  const stats = getCityStats(city.trim());
  if (stats.log_count === 0) {
    console.log(`No weather logs found for "${city.trim()}".`);
    return;
  }

  console.log(`Weather statistics for ${city.trim()} (${stats.log_count} logs)`);
  console.log(`Minimum: ${stats.min_temperature_c.toFixed(1)} °C`);
  console.log(`Maximum: ${stats.max_temperature_c.toFixed(1)} °C`);
  console.log(`Average: ${stats.average_temperature_c.toFixed(1)} °C`);
}

// Dispatch the CLI command and convert errors to concise user-facing messages.
async function main(args) {
  const [command, ...commandArgs] = args;

  try {
    if (command === "add") {
      if (commandArgs.length !== 1) throw new Error('Usage: node src/cli.js add "<city>"');
      await addCity(commandArgs[0]);
    } else if (command === "list") {
      printLogs(listWeatherLogs(parseListLimit(commandArgs)));
    } else if (command === "stats") {
      if (commandArgs.length !== 1) throw new Error('Usage: node src/cli.js stats "<city>"');
      printStats(commandArgs[0]);
    } else {
      throw new Error(
        "Usage: node src/cli.js <add|list|stats> [arguments]\n" +
        'Examples: node src/cli.js add "London"; node src/cli.js list --limit 5',
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

await main(process.argv.slice(2));
