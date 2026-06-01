import requests
import logging
import time
from geopy.geocoders import Nominatim

# Logging setup
logging.basicConfig(
    filename="weather_alerts.log",
    level=logging.INFO,
    format="%(asctime)s - %(message)s"
)

# NOAA API specifics
NOAA_BASE_URL = "https://api.weather.gov"
REGION = "Raleigh, NC"  # Example region targeted for Hurricane Fran and Irene events

# Alert configurations
ALERT_KEYWORDS = ["hurricane", "storm", "flood", "tornado"]

# Initialize geolocator to fetch latitude/longitude
geolocator = Nominatim(user_agent="weather_monitor")

def get_coordinates(location_name):
    """
    Get latitude and longitude from a location name.
    """
    try:
        location = geolocator.geocode(location_name)
        return location.latitude, location.longitude
    except Exception as e:
        logging.error(f"Error fetching coordinates for {location_name}: {e}")
        return None, None

def fetch_current_weather(latitude, longitude):
    """
    Fetch weather alerts for the given coordinates.
    """
    try:
        endpoint = f"{NOAA_BASE_URL}/alerts/active?point={latitude},{longitude}"
        response = requests.get(endpoint)
        if response.status_code == 200:
            return response.json()
        else:
            logging.error(f"Failed to fetch weather data (status {response.status_code}): {response.text}")
            return {}
    except Exception as e:
        logging.error(f"Error contacting NOAA API: {e}")
        return {}

def analyze_weather_data(data):
    """
    Analyze weather alert data for specific conditions.
    """
    try:
        alerts = data.get("features", [])
        for alert in alerts:
            properties = alert.get("properties", {})
            event = properties.get("event", "").lower()

            if any(keyword in event for keyword in ALERT_KEYWORDS):
                logging.warning(f"⚠️ Weather Alert Detected: {event}")
                print(f"⚠️ Weather Alert Triggered: {event}")
    except Exception as e:
        logging.error(f"Error analyzing weather data: {e}")

def monitor_weather(region_name):
    """
    Monitor weather conditions for the given region.
    """
    latitude, longitude = get_coordinates(region_name)
    if latitude and longitude:
        logging.info(f"Monitoring weather conditions at {region_name} ({latitude}, {longitude})...")
        while True:
            weather_data = fetch_current_weather(latitude, longitude)
            analyze_weather_data(weather_data)
            logging.info("Weather checked successfully. Waiting for the next scan...")
            time.sleep(900)  # Check weather every 15 minutes
    else:
        logging.error(f"Unable to start monitoring: Invalid location data for {region_name}")

if __name__ == "__main__":
    monitor_weather(REGION)