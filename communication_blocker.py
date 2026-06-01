import logging
import requests
import re

# Logging setup for communication monitoring
logging.basicConfig(
    filename="communication_blocker.log",
    level=logging.INFO,
    format="%(asctime)s - %(message)s"
)

# List of blocked numbers (can be dynamically updated via a database)
BLOCKED_NUMBERS = ["+1234567890", "+1987654321"]

# List of suspicious switchboard numbers (e.g., 1-800, 1-900)
SUSPICIOUS_NUMBERS = re.compile(r"^1-?800|1-?900")

# Twilio Configuration
TWILIO_ACCOUNT_SID = "your_account_sid"
TWILIO_AUTH_TOKEN = "your_auth_token"
TWILIO_URL = "https://api.twilio.com/2010-04-01"  # Base API URL

def fetch_call_logs():
    """
    Fetch all calls and messages from your Twilio account.
    """
    url = f"{TWILIO_URL}/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json"
    response = requests.get(url, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))
    if response.status_code == 200:
        return response.json().get("calls", [])
    else:
        logging.error(f"Failed to fetch call logs: {response.text}")
        return []

def fetch_message_logs():
    """
    Fetch all SMS/MMS/RCS messages from your Twilio account.
    """
    url = f"{TWILIO_URL}/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    response = requests.get(url, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))
    if response.status_code == 200:
        return response.json().get("messages", [])
    else:
        logging.error(f"Failed to fetch message logs: {response.text}")
        return []

def analyze_and_block_communications(communications, communication_type="message"):
    """
    Analyze and block communications based on rules:
    1. Block interactions with blocked numbers.
    2. Log and flag suspicious switchboard numbers (1-800, 1-900, etc.).
    """
    for comm in communications:
        from_number = comm.get("from")
        to_number = comm.get("to")
        
        # Check for blocked numbers
        if from_number in BLOCKED_NUMBERS or to_number in BLOCKED_NUMBERS:
            logging.warning(f"Blocked {communication_type} between {from_number} and {to_number}.")
            block_communication(comm["sid"], communication_type)
        
        # Check for suspicious switchboard numbers
        if SUSPICIOUS_NUMBERS.match(from_number) or SUSPICIOUS_NUMBERS.match(to_number):
            logging.info(f"Flagged suspicious number in {communication_type} from {from_number} to {to_number}.")
    
def block_communication(sid, communication_type):
    """
    Block a specific call or message.
    """
    try:
        url = f"{TWILIO_URL}/Accounts/{TWILIO_ACCOUNT_SID}"
        if communication_type == "call":
            url += f"/Calls/{sid}.json"
        elif communication_type == "message":
            url += f"/Messages/{sid}.json"
        
        response = requests.delete(url, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))
        if response.status_code in (200, 204):
            logging.info(f"Successfully blocked {communication_type} with SID {sid}.")
        else:
            logging.error(f"Failed to block {communication_type} with SID {sid}: {response.text}")
    except Exception as e:
        logging.error(f"Error blocking {communication_type}: {e}")

def monitor_communications():
    """
    Monitor calls and messages for blocked numbers, suspicious activity, and unauthorized access.
    """
    logging.info("Starting communication monitoring...")
    
    # Fetch message logs and analyze
    messages = fetch_message_logs()
    analyze_and_block_communications(messages, communication_type="message")
    
    # Fetch call logs and analyze
    calls = fetch_call_logs()
    analyze_and_block_communications(calls, communication_type="call")


if __name__ == "__main__":
    monitor_communications()