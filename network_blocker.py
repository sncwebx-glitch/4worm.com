import subprocess
import logging

# Logging setup for network blocking actions
logging.basicConfig(
    filename="network_blocker.log",
    level=logging.INFO,
    format="%(asctime)s - %(message)s"
)

# Snapchat and Tinder related domain lists
BLOCKED_DOMAINS = [
    "snapchat.com",
    "sc-cdn.net",
    "gotinder.com",
    "cdn.gotinder.com"
]

# Function to apply iptables rules to block specific domains
def block_domains():
    try:
        for domain in BLOCKED_DOMAINS:
            logging.info(f"Applying iptables rule to block {domain}.")
            subprocess.run(["sudo", "iptables", "-A", "OUTPUT", "-p", "tcp", "-d", domain, "-j", "REJECT"], check=True)

        # Make rules persistent
        subprocess.run(["sudo", "iptables-save"], check=True)
        logging.info("All domains blocked successfully and rules saved.")
    except subprocess.CalledProcessError as e:
        logging.error(f"Error applying iptables rule: {e}")

if __name__ == "__main__":
    block_domains()