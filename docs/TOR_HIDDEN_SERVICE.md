# Hosting 4worm.com as a Tor Hidden Service

This guide explains how to publish the static 4worm.com site as a Tor hidden
service (a `.onion` address), and how to optionally generate a custom
"vanity" `.onion` address for it.

> A `.onion` address is **not** derived from a phone number, domain name, or
> any personal identifier. It is generated from a fresh Ed25519 key pair
> created by the Tor software (or a vanity-address generator) when the
> hidden service is set up.

## Prerequisites

- A server (or always-on machine) that can run the Tor daemon
- Tor installed (`apt install tor`, `brew install tor`, etc.)
- A local web server able to serve this repository's static files
  (e.g. `python -m http.server 8000`, `npx http-server`, nginx, or Apache)

## 1. Serve the site locally

Hidden services proxy Tor traffic to a local, non-public web server. From the
repository root:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Confirm the site loads at `http://127.0.0.1:8000` before continuing.

## 2. Example `torrc` configuration

Add the following to your `torrc` file (commonly
`/etc/tor/torrc` on Linux):

```
# --- 4worm.com hidden service ---
HiddenServiceDir /var/lib/tor/4worm_onion/
HiddenServicePort 80 127.0.0.1:8000
```

- `HiddenServiceDir` is where Tor stores the service's private key
  (`hs_ed25519_secret_key`) and public hostname (`hostname`).
- `HiddenServicePort` maps the public onion port (80) to the local server
  and port serving this repository (`127.0.0.1:8000`).

Restart Tor to apply the configuration:

```bash
sudo systemctl restart tor
```

## 3. Retrieve your `.onion` address

After Tor starts, it generates the hidden service's keys and address:

```bash
sudo cat /var/lib/tor/4worm_onion/hostname
```

This prints a random 56-character `.onion` v3 address, for example:
`abcdefghijklmnopqrstuvwxyz234567abcdefghijklmnopqrstuvwx.onion`

Visit this address with the Tor Browser to confirm the site is reachable.

## 4. (Optional) Generate a vanity `.onion` address

If you want the address to start with a chosen prefix (e.g.
`4worm...onion`), use [`mkp224o`](https://github.com/cathugger/mkp224o), a
tool that brute-forces Ed25519 key pairs until the resulting `.onion`
address matches your desired prefix. This runs entirely on your own machine
— no external service ever sees the private key.

```bash
# Build mkp224o (requires a C compiler and libsodium)
git clone https://github.com/cathugger/mkp224o.git
cd mkp224o
./autogen.sh
./configure
make

# Search for an address starting with "4worm"
./mkp224o 4worm -d ./keys -n 1
```

- `4worm` is the desired prefix (longer prefixes take exponentially longer
  to find).
- `-d ./keys` writes the resulting key material to `./keys/<address>.onion/`.
- `-n 1` stops after finding one matching address.

Once a match is found, copy the generated directory contents into your
`HiddenServiceDir` (e.g. `/var/lib/tor/4worm_onion/`), matching ownership
and permissions (`700` for the directory, `600` for key files), then
restart Tor:

```bash
sudo cp -r keys/4worm*.onion/* /var/lib/tor/4worm_onion/
sudo chown -R debian-tor:debian-tor /var/lib/tor/4worm_onion/
sudo chmod 700 /var/lib/tor/4worm_onion/
sudo systemctl restart tor
```

## Security notes

- Never share the `hs_ed25519_secret_key` file — anyone with it can
  impersonate your hidden service.
- Keep the local web server bound to `127.0.0.1` only; do not expose it on
  a public interface, or the clearnet address will bypass Tor's anonymity
  properties.
- Review [SECURITY.md](SECURITY.md) for general hardening recommendations
  before deploying any environment, hidden service or not.
