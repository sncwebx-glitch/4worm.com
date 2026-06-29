/**
 * Weather Dashboard - Data Fetcher
 * Fetches weather data from OpenWeatherMap API
 */

export interface WeatherData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  cloudCoverage: number;
  visibility: number;
  uvIndex: number;
  description: string;
  icon: string;
  sunrise: Date;
  sunset: Date;
  timestamp: Date;
}

export interface ForecastData {
  date: Date;
  temperature: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  description: string;
  icon: string;
  precipitation: number;
  probabilityOfPrecipitation: number;
}

export interface AirQualityData {
  city: string;
  aqi: number; // 1-5 scale
  aqiLabel: string;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  timestamp: Date;
}

export interface WeatherAlert {
  event: string;
  start: Date;
  end: Date;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
}

export class WeatherDataFetcher {
  private apiKey: string;
  private baseUrl: string = 'https://api.openweathermap.org';
  private units: 'metric' | 'imperial' = 'metric';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheDuration: number = 600000; // 10 minutes in milliseconds

  constructor(apiKey: string, units: 'metric' | 'imperial' = 'metric') {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.units = units;
  }

  /**
   * Set cache duration in milliseconds
   */
  public setCacheDuration(milliseconds: number): void {
    this.cacheDuration = milliseconds;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age < this.cacheDuration;
  }

  /**
   * Get cached data if valid
   */
  private getFromCache<T>(key: string): T | null {
    if (this.isCacheValid(key)) {
      return this.cache.get(key)!.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Store data in cache
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Fetch current weather for a city
   */
  public async getCurrentWeather(city: string): Promise<WeatherData> {
    const cacheKey = `weather_${city}`;

    // Check cache first
    const cached = this.getFromCache<WeatherData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/data/2.5/weather?q=${encodeURIComponent(city)}&units=${this.units}&appid=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.statusText}`);
      }

      const data = await response.json();

      const weatherData: WeatherData = {
        city: data.name,
        country: data.sys.country,
        latitude: data.coord.lat,
        longitude: data.coord.lon,
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg || 0,
        cloudCoverage: data.clouds.all,
        visibility: data.visibility,
        uvIndex: 0, // Requires separate API call
        description: data.weather[0].main,
        icon: data.weather[0].icon,
        sunrise: new Date(data.sys.sunrise * 1000),
        sunset: new Date(data.sys.sunset * 1000),
        timestamp: new Date(),
      };

      this.setCache(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      throw new Error(`Failed to fetch current weather: ${error}`);
    }
  }

  /**
   * Fetch weather by coordinates (latitude, longitude)
   */
  public async getWeatherByCoordinates(lat: number, lon: number): Promise<WeatherData> {
    const cacheKey = `weather_${lat}_${lon}`;

    const cached = this.getFromCache<WeatherData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/data/2.5/weather?lat=${lat}&lon=${lon}&units=${this.units}&appid=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.statusText}`);
      }

      const data = await response.json();

      const weatherData: WeatherData = {
        city: data.name,
        country: data.sys.country,
        latitude: data.coord.lat,
        longitude: data.coord.lon,
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg || 0,
        cloudCoverage: data.clouds.all,
        visibility: data.visibility,
        uvIndex: 0,
        description: data.weather[0].main,
        icon: data.weather[0].icon,
        sunrise: new Date(data.sys.sunrise * 1000),
        sunset: new Date(data.sys.sunset * 1000),
        timestamp: new Date(),
      };

      this.setCache(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      throw new Error(`Failed to fetch weather by coordinates: ${error}`);
    }
  }

  /**
   * Fetch 5-day forecast
   */
  public async getForecast(city: string): Promise<ForecastData[]> {
    const cacheKey = `forecast_${city}`;

    const cached = this.getFromCache<ForecastData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/data/2.5/forecast?q=${encodeURIComponent(city)}&units=${this.units}&appid=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Forecast API error: ${response.statusText}`);
      }

      const data = await response.json();
      const forecasts: ForecastData[] = data.list.map((item: any) => ({
        date: new Date(item.dt * 1000),
        temperature: item.main.temp,
        tempMin: item.main.temp_min,
        tempMax: item.main.temp_max,
        humidity: item.main.humidity,
        pressure: item.main.pressure,
        windSpeed: item.wind.speed,
        description: item.weather[0].main,
        icon: item.weather[0].icon,
        precipitation: item.rain?.['3h'] || 0,
        probabilityOfPrecipitation: item.pop || 0,
      }));

      this.setCache(cacheKey, forecasts);
      return forecasts;
    } catch (error) {
      throw new Error(`Failed to fetch forecast: ${error}`);
    }
  }

  /**
   * Fetch air quality data
   */
  public async getAirQuality(lat: number, lon: number): Promise<AirQualityData> {
    const cacheKey = `aqi_${lat}_${lon}`;

    const cached = this.getFromCache<AirQualityData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Air Quality API error: ${response.statusText}`);
      }

      const data = await response.json();
      const components = data.list[0].components;
      const aqi = data.list[0].main.aqi;

      const aqiLabels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];

      // Get city name from reverse geocoding
      const cityName = await this.getCityName(lat, lon);

      const airQualityData: AirQualityData = {
        city: cityName,
        aqi,
        aqiLabel: aqiLabels[aqi - 1] || 'Unknown',
        pm25: components.pm2_5 || 0,
        pm10: components.pm10 || 0,
        o3: components.o3 || 0,
        no2: components.no2 || 0,
        so2: components.so2 || 0,
        co: components.co || 0,
        timestamp: new Date(),
      };

      this.setCache(cacheKey, airQualityData);
      return airQualityData;
    } catch (error) {
      throw new Error(`Failed to fetch air quality: ${error}`);
    }
  }

  /**
   * Get city name from coordinates (reverse geocoding)
   */
  private async getCityName(lat: number, lon: number): Promise<string> {
    try {
      const url = `${this.baseUrl}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        return 'Unknown';
      }

      const data = await response.json();
      return data[0]?.name || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get UV index
   */
  public async getUVIndex(lat: number, lon: number): Promise<number> {
    const cacheKey = `uv_${lat}_${lon}`;

    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      this.setCache(cacheKey, data.value);
      return data.value;
    } catch {
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export default WeatherDataFetcher;
