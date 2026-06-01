import os
from scapy.all import sniff
import logging
import subprocess
import re
import time

# Setup logging for backend monitoring events
logging.basicConfig(filename="worm_detection.log", level=logging.INFO, format="%(asctime)s - %(message)s")

# Define constants
DEAD_URLS = [
    "example404.com",  # List of known dead 404 sites to monitor
    "malicious-site-xyz.com"
]

SUSPICIOUS_TAGS = [
    "worm",
    "energy_spike",
    "manipulation_attempt"
]

ENERGY_THRESHOLD = 80  # Arbitrary threshold for resource usage (%) to trigger action

# Function to blacklist suspicious IPs
def block_ip(ip_address):
    try:
        logging.warning(f"Blocking suspected malicious IP: {ip_address}")
        subprocess.run(["sudo", "iptables", "-A", "INPUT", "-s", ip_address, "-j", "DROP"])
    except Exception as e:
        logging.error(f"Failed to block IP: {e}")

# Function to shut down backend trails for safety
def shutdown_backend():
    try:
        logging.warning("Shutting down backend services due to worm-like activity!")
        # Replace `backend_service` with the name of actual backend system services
        os.system("sudo systemctl stop backend_service")
    except Exception as e:
        logging.error(f"Failed to shut down backend: {e}")

# Function to monitor and cut off suspicious backend trails
def detect_and_cut(packet):
    """
    Analyze network packets to monitor for worms or suspicious activities.
    """
    try:
        # Parse packet's payload as string
        payload = str(packet)

        # Check for known suspicious tags
        for tag in SUSPICIOUS_TAGS:
            if tag in payload.lower():
                logging.warning(f"Suspicious activity detected: {tag}")
                shutdown_backend()
                return

        # Extract destination host from HTTP packets (examples of 404 sites or "worm" trails)
        pattern = re.compile(r"(?P<url>https?://[^\s]+)")
        matches = pattern.search(payload)
        if matches:
            url = matches.group("url")
            for dead_url in DEAD_URLS:
                if dead_url in url:
                    logging.warning(f"Connection to a dead site detected: {url}")
                    # Optionally, terminate the connection here (e.g., block it)
                    return

    except Exception as e:
        logging.error(f"Error analyzing packet: {e}")

# Function to monitor power usage (simulated example based on available system tools)
def monitor_energy():
    try:
        while True:
            # Replace with appropriate energy monitoring commands/tools
            energy_usage = os.popen("ps -eo pcpu").read()
            usage_percent = sum(float(cpu) for cpu in energy_usage.split() if cpu.replace('.', '').isnumeric())
            if usage_percent > ENERGY_THRESHOLD:
                logging.warning(f"Energy spike detected: {usage_percent}%")
                shutdown_backend()
            time.sleep(5)  # Check every 5 seconds
    except Exception as e:
        logging.error(f"Error monitoring energy: {e}")

# Start monitoring
def main():
    print("Starting worm detection system...")
    logging.info("Worm detection system started.")

    # Run network traffic monitoring
    sniff(prn=detect_and_cut)

    # Start energy monitoring on a separate thread
    import threading
    energy_thread = threading.Thread(target=monitor_energy)
    energy_thread.start()

if __name__ == "__main__":
    main()