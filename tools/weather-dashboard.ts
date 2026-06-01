/**
 * Weather Dashboard Component
 * HTML/CSS/JavaScript UI for displaying weather data
 */

export const WEATHER_DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather Dashboard</title>
    <link rel="stylesheet" href="weather-dashboard.css">
</head>
<body>
    <div class="dashboard-container">
        <!-- Header -->
        <header class="dashboard-header">
            <h1>🌤️ Weather Dashboard</h1>
            <div class="search-container">
                <input 
                    type="text" 
                    id="cityInput" 
                    placeholder="Enter city name..." 
                    class="search-input"
                />
                <button id="searchBtn" class="search-btn">Search</button>
                <button id="locationBtn" class="location-btn">📍 My Location</button>
            </div>
        </header>

        <!-- Current Weather Section -->
        <section class="current-weather">
            <div id="loading" class="loading">Loading weather data...</div>
            
            <div id="currentWeatherCard" class="weather-card hidden">
                <div class="location-info">
                    <h2 id="cityName"></h2>
                    <p id="timestamp"></p>
                </div>

                <div class="temperature-display">
                    <div class="temperature">
                        <span id="temp"></span>°C
                    </div>
                    <div class="weather-icon">
                        <img id="weatherIcon" src="" alt="weather icon" />
                    </div>
                </div>

                <div class="weather-description">
                    <p id="description"></p>
                    <p id="feelsLike"></p>
                </div>

                <div class="weather-details">
                    <div class="detail">
                        <span class="label">💧 Humidity</span>
                        <span id="humidity" class="value"></span>
                    </div>
                    <div class="detail">
                        <span class="label">🌬️ Wind Speed</span>
                        <span id="windSpeed" class="value"></span>
                    </div>
                    <div class="detail">
                        <span class="label">🔽 Pressure</span>
                        <span id="pressure" class="value"></span>
                    </div>
                    <div class="detail">
                        <span class="label">☁️ Cloud Coverage</span>
                        <span id="cloudCoverage" class="value"></span>
                    </div>
                    <div class="detail">
                        <span class="label">👁️ Visibility</span>
                        <span id="visibility" class="value"></span>
                    </div>
                    <div class="detail">
                        <span class="label">☀️ UV Index</span>
                        <span id="uvIndex" class="value"></span>
                    </div>
                </div>

                <div class="sun-times">
                    <div class="time-info">
                        <span class="label">🌅 Sunrise</span>
                        <span id="sunrise" class="value"></span>
                    </div>
                    <div class="time-info">
                        <span class="label">🌇 Sunset</span>
                        <span id="sunset" class="value"></span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Forecast Section -->
        <section class="forecast-section">
            <h3>5-Day Forecast</h3>
            <div id="forecastContainer" class="forecast-container"></div>
        </section>

        <!-- Air Quality Section -->
        <section class="air-quality-section">
            <h3>Air Quality</h3>
            <div id="airQualityCard" class="quality-card">
                <div class="aqi-display">
                    <div class="aqi-circle">
                        <span id="aqiValue"></span>
                    </div>
                    <div class="aqi-info">
                        <p id="aqiLabel"></p>
                        <p id="aqiDescription"></p>
                    </div>
                </div>

                <div class="pollutants">
                    <div class="pollutant">
                        <span class="label">PM2.5</span>
                        <span id="pm25" class="value"></span>
                    </div>
                    <div class="pollutant">
                        <span class="label">PM10</span>
                        <span id="pm10" class="value"></span>
                    </div>
                    <div class="pollutant">
                        <span class="label">O₃</span>
                        <span id="o3" class="value"></span>
                    </div>
                    <div class="pollutant">
                        <span class="label">NO₂</span>
                        <span id="no2" class="value"></span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Error Message -->
        <div id="errorMessage" class="error-message hidden"></div>
    </div>

    <script src="weather-dashboard.js"></script>
</body>
</html>
`;

export const WEATHER_DASHBOARD_CSS = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
}

.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
}

/* Header */
.dashboard-header {
    background: rgba(255, 255, 255, 0.95);
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    margin-bottom: 30px;
}

.dashboard-header h1 {
    color: #333;
    margin-bottom: 20px;
    font-size: 2.5em;
}

.search-container {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.search-input {
    flex: 1;
    min-width: 200px;
    padding: 12px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1em;
    transition: border-color 0.3s;
}

.search-input:focus {
    outline: none;
    border-color: #667eea;
}

.search-btn,
.location-btn {
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1em;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.search-btn:hover,
.location-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

/* Current Weather Card */
.current-weather {
    margin-bottom: 30px;
}

.weather-card {
    background: rgba(255, 255, 255, 0.95);
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.weather-card.hidden {
    display: none;
}

.location-info h2 {
    color: #333;
    font-size: 2em;
    margin-bottom: 5px;
}

.location-info p {
    color: #999;
    font-size: 0.9em;
}

.temperature-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 30px 0;
    padding: 30px 0;
    border-bottom: 2px solid #f0f0f0;
}

.temperature {
    font-size: 4em;
    color: #667eea;
    font-weight: bold;
}

.weather-icon img {
    width: 120px;
    height: 120px;
}

.weather-description {
    text-align: center;
    margin-bottom: 30px;
}

.weather-description p {
    font-size: 1.2em;
    color: #555;
    margin: 8px 0;
}

.weather-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.detail {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
}

.detail .label {
    display: block;
    color: #666;
    font-size: 0.9em;
    margin-bottom: 8px;
}

.detail .value {
    display: block;
    color: #333;
    font-size: 1.4em;
    font-weight: bold;
}

.sun-times {
    display: flex;
    gap: 20px;
    justify-content: center;
    padding-top: 20px;
    border-top: 2px solid #f0f0f0;
}

.time-info {
    text-align: center;
}

.time-info .label {
    display: block;
    color: #666;
    margin-bottom: 5px;
}

.time-info .value {
    display: block;
    color: #333;
    font-weight: bold;
    font-size: 1.1em;
}

/* Forecast Section */
.forecast-section {
    margin-bottom: 30px;
}

.forecast-section h3 {
    color: white;
    margin-bottom: 15px;
    font-size: 1.5em;
}

.forecast-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
}

.forecast-card {
    background: rgba(255, 255, 255, 0.95);
    padding: 15px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s;
}

.forecast-card:hover {
    transform: translateY(-5px);
}

.forecast-date {
    color: #666;
    font-size: 0.9em;
    margin-bottom: 10px;
}

.forecast-icon {
    font-size: 2.5em;
    margin: 10px 0;
}

.forecast-temp {
    color: #333;
    font-weight: bold;
    margin: 10px 0;
}

.forecast-range {
    color: #999;
    font-size: 0.85em;
    margin-bottom: 8px;
}

.forecast-rain {
    color: #667eea;
    font-size: 0.85em;
}

/* Air Quality Section */
.air-quality-section {
    margin-bottom: 30px;
}

.air-quality-section h3 {
    color: white;
    margin-bottom: 15px;
    font-size: 1.5em;
}

.quality-card {
    background: rgba(255, 255, 255, 0.95);
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.aqi-display {
    display: flex;
    align-items: center;
    gap: 30px;
    margin-bottom: 30px;
}

.aqi-circle {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2em;
    font-weight: bold;
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.aqi-info p {
    margin: 8px 0;
    color: #333;
}

.aqi-info p:first-child {
    font-size: 1.3em;
    font-weight: bold;
}

.pollutants {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 15px;
}

.pollutant {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
}

.pollutant .label {
    display: block;
    color: #666;
    font-size: 0.9em;
    margin-bottom: 8px;
}

.pollutant .value {
    display: block;
    color: #333;
    font-size: 1.3em;
    font-weight: bold;
}

/* Loading & Error States */
.loading {
    text-align: center;
    color: white;
    font-size: 1.2em;
    padding: 40px;
}

.error-message {
    background: #ff6b6b;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    animation: slideIn 0.3s ease-out;
}

.error-message.hidden {
    display: none;
}

@keyframes slideIn {
    from {
        transform: translateY(-20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.hidden {
    display: none;
}

/* Responsive Design */
@media (max-width: 768px) {
    .dashboard-header h1 {
        font-size: 1.8em;
    }

    .search-container {
        flex-direction: column;
    }

    .search-input,
    .search-btn,
    .location-btn {
        width: 100%;
    }

    .temperature-display {
        flex-direction: column;
        gap: 20px;
    }

    .temperature {
        font-size: 3em;
    }

    .aqi-display {
        flex-direction: column;
        text-align: center;
    }

    .weather-details {
        grid-template-columns: repeat(2, 1fr);
    }

    .forecast-container {
        grid-template-columns: 1fr;
    }
}
`;

export const WEATHER_DASHBOARD_JS = `
class WeatherDashboard {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.openweathermap.org';
        this.units = 'metric';
        
        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('searchBtn').addEventListener('click', () => this.search());
        document.getElementById('cityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.search();
        });
        document.getElementById('locationBtn').addEventListener('click', () => this.getLocation());
    }

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        setTimeout(() => errorEl.classList.add('hidden'), 5000);
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('currentWeatherCard').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    search() {
        const city = document.getElementById('cityInput').value.trim();
        if (city) {
            this.getWeatherByCity(city);
        }
    }

    getLocation() {
        if (navigator.geolocation) {
            this.showLoading();
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.getWeatherByCoords(latitude, longitude);
                },
                (error) => {
                    this.showError('Unable to get your location: ' + error.message);
                    this.hideLoading();
                }
            );
        } else {
            this.showError('Geolocation is not supported by your browser');
        }
    }

    async getWeatherByCity(city) {
        this.showLoading();
        try {
            const response = await fetch(
                \`\${this.baseUrl}/data/2.5/weather?q=\${encodeURIComponent(city)}&units=\${this.units}&appid=\${this.apiKey}\`
            );

            if (!response.ok) {
                throw new Error('City not found');
            }

            const data = await response.json();
            await this.displayWeather(data);
            
            // Fetch forecast
            this.getForecasting(city);
            
            // Fetch air quality
            this.getAirQuality(data.coord.lat, data.coord.lon);
        } catch (error) {
            this.showError(error.message);
            this.hideLoading();
        }
    }

    async getWeatherByCoords(lat, lon) {
        this.showLoading();
        try {
            const response = await fetch(
                \`\${this.baseUrl}/data/2.5/weather?lat=\${lat}&lon=\${lon}&units=\${this.units}&appid=\${this.apiKey}\`
            );

            if (!response.ok) {
                throw new Error('Unable to fetch weather');
            }

            const data = await response.json();
            document.getElementById('cityInput').value = data.name;
            await this.displayWeather(data);
            
            // Fetch forecast
            this.getForecasting(data.name);
            
            // Fetch air quality
            this.getAirQuality(lat, lon);
        } catch (error) {
            this.showError(error.message);
            this.hideLoading();
        }
    }

    async displayWeather(data) {
        const card = document.getElementById('currentWeatherCard');
        
        document.getElementById('cityName').textContent = \`\${data.name}, \${data.sys.country}\`;
        document.getElementById('timestamp').textContent = new Date().toLocaleString();
        document.getElementById('temp').textContent = Math.round(data.main.temp);
        document.getElementById('feelsLike').textContent = \`Feels like \${Math.round(data.main.feels_like)}°C\`;
        document.getElementById('description').textContent = data.weather[0].main;
        document.getElementById('humidity').textContent = data.main.humidity + '%';
        document.getElementById('windSpeed').textContent = data.wind.speed + ' m/s';
        document.getElementById('pressure').textContent = data.main.pressure + ' hPa';
        document.getElementById('cloudCoverage').textContent = data.clouds.all + '%';
        document.getElementById('visibility').textContent = (data.visibility / 1000).toFixed(1) + ' km';
        
        const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
        const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();
        document.getElementById('sunrise').textContent = sunrise;
        document.getElementById('sunset').textContent = sunset;

        // Set weather icon
        const iconUrl = \`https://openweathermap.org/img/wn/\${data.weather[0].icon}@4x.png\`;
        document.getElementById('weatherIcon').src = iconUrl;

        // Fetch UV Index
        this.getUVIndex(data.coord.lat, data.coord.lon);

        card.classList.remove('hidden');
        this.hideLoading();
    }

    async getForecasting(city) {
        try {
            const response = await fetch(
                \`\${this.baseUrl}/data/2.5/forecast?q=\${encodeURIComponent(city)}&units=\${this.units}&appid=\${this.apiKey}\`
            );

            if (!response.ok) return;

            const data = await response.json();
            this.displayForecast(data.list);
        } catch (error) {
            console.error('Forecast error:', error);
        }
    }

    displayForecast(forecasts) {
        const container = document.getElementById('forecastContainer');
        container.innerHTML = '';

        // Get every 8th item (once per day, assuming 3-hourly data)
        const dailyForecasts = forecasts.filter((_, index) => index % 8 === 0).slice(0, 5);

        dailyForecasts.forEach(forecast => {
            const date = new Date(forecast.dt * 1000);
            const card = document.createElement('div');
            card.className = 'forecast-card';
            
            const rain = forecast.rain ? forecast.rain['3h'] : 0;
            const pop = (forecast.pop * 100).toFixed(0);

            card.innerHTML = \`
                <div class="forecast-date">\${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div class="forecast-icon">
                    <img src="https://openweathermap.org/img/wn/\${forecast.weather[0].icon}@2x.png" alt="weather" />
                </div>
                <div class="forecast-temp">\${Math.round(forecast.main.temp)}°C</div>
                <div class="forecast-range">\${Math.round(forecast.main.temp_min)}°-\${Math.round(forecast.main.temp_max)}°</div>
                <div class="forecast-rain">💧 \${pop}% rain</div>
            \`;
            
            container.appendChild(card);
        });
    }

    async getAirQuality(lat, lon) {
        try {
            const response = await fetch(
                \`\${this.baseUrl}/data/2.5/air_pollution?lat=\${lat}&lon=\${lon}&appid=\${this.apiKey}\`
            );

            if (!response.ok) return;

            const data = await response.json();
            const aqi = data.list[0].main.aqi;
            const components = data.list[0].components;

            const aqiLabels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
            const aqiDescriptions = [
                'Air quality is good',
                'Air quality is fair',
                'Air quality is moderate',
                'Air quality is poor',
                'Air quality is very poor'
            ];

            document.getElementById('aqiValue').textContent = aqi;
            document.getElementById('aqiLabel').textContent = aqiLabels[aqi - 1];
            document.getElementById('aqiDescription').textContent = aqiDescriptions[aqi - 1];
            document.getElementById('pm25').textContent = Math.round(components.pm2_5) + ' µg/m³';
            document.getElementById('pm10').textContent = Math.round(components.pm10) + ' µg/m³';
            document.getElementById('o3').textContent = Math.round(components.o3) + ' µg/m³';
            document.getElementById('no2').textContent = Math.round(components.no2) + ' µg/m³';
        } catch (error) {
            console.error('Air quality error:', error);
        }
    }

    async getUVIndex(lat, lon) {
        try {
            const response = await fetch(
                \`\${this.baseUrl}/data/2.5/uvi?lat=\${lat}&lon=\${lon}&appid=\${this.apiKey}\`
            );

            if (!response.ok) return;

            const data = await response.json();
            document.getElementById('uvIndex').textContent = Math.round(data.value);
        } catch (error) {
            console.error('UV Index error:', error);
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Replace with your actual API key
    const API_KEY = 'YOUR_API_KEY_HERE';
    new WeatherDashboard(API_KEY);
});
`;

export default {
  html: WEATHER_DASHBOARD_HTML,
  css: WEATHER_DASHBOARD_CSS,
  js: WEATHER_DASHBOARD_JS,
};
