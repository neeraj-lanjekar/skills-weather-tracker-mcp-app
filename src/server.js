import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  getWeatherSummary,
  insertWeatherLog,
  listWeatherLogs,
} from "./db.js";
import { fetchCurrentWeather, geocodeCity } from "./weather.js";

const PORT = 3000;
const dashboardPath = fileURLToPath(new URL("../public/index.html", import.meta.url));

// Send a JSON response with a consistent content type.
function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

// Serve the dashboard and the weather API routes.
async function handleRequest(request, response) {
  const url = new URL(request.url, "http://localhost");

  if (url.pathname === "/" && request.method === "GET") {
    const html = await readFile(dashboardPath);
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }

  if (url.pathname === "/api/logs" && request.method === "GET") {
    sendJson(response, 200, listWeatherLogs(50));
    return;
  }

  if (url.pathname === "/api/summary" && request.method === "GET") {
    sendJson(response, 200, getWeatherSummary());
    return;
  }

  if (url.pathname === "/api/refresh" && request.method === "POST") {
    const city = url.searchParams.get("city")?.trim();
    if (!city || city.length > 100) {
      sendJson(response, 400, { error: "Enter a city name of 1 to 100 characters." });
      return;
    }

    let weather;
    try {
      const location = await geocodeCity(city);
      weather = await fetchCurrentWeather(location);
    } catch (error) {
      const status = error.message.startsWith("No location found") ? 404 : 502;
      sendJson(response, status, { error: error.message });
      return;
    }

    try {
      insertWeatherLog(weather);
    } catch (error) {
      console.error(`Could not save weather observation: ${error.message}`);
      sendJson(response, 500, { error: "Could not save this weather observation." });
      return;
    }

    sendJson(response, 201, { weather });
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "API endpoint not found." });
    return;
  }

  sendJson(response, 404, { error: "Page not found." });
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(`Request failed: ${error.message}`);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "The server could not complete this request." });
    } else {
      response.destroy();
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Weather dashboard listening at http://localhost:${PORT}`);
});
