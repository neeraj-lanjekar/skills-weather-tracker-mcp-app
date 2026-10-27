# Open-Meteo API notes

These notes record the fields needed to populate `weather_logs`.

## Geocoding

Endpoint: `https://geocoding-api.open-meteo.com/v1/search`

Query parameters: `name=Pune&count=1`

Fields used from each result:

- `name` → `city`
- `country` → `country`
- `latitude` → `latitude`
- `longitude` → `longitude`

Trimmed response captured through the Fetch MCP server:

```json
{
  "results": [
    {
      "name": "Pune",
      "latitude": 18.51957,
      "longitude": 73.85535,
      "country": "India"
    }
  ]
}
```

## Current weather

Endpoint: `https://api.open-meteo.com/v1/forecast`

Query parameters: `latitude=18.51957&longitude=73.85535&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`

Fields expected under `current`:

- `temperature_2m` → `temperature_c` (Celsius, as indicated by `current_units`)
- `relative_humidity_2m` → `humidity` (percent)
- `wind_speed_10m` → `wind_kmh` (use the unit reported by `current_units`; the API default is km/h)
- `weather_code` → `weather_code`

The endpoint returns a numeric `weather_code`, not a condition description. Populate `condition` only after defining a weather-code-to-description mapping.

The Fetch MCP server rejected this forecast request because `api.open-meteo.com/robots.txt` disallows automated fetching. No live forecast response was available, so this file intentionally does not invent an example response or weather values. Retry the request manually through the Fetch MCP UI to capture the response before inserting the Pune weather row.
