# Local SSL Certificate Generation

This document contains the command to generate local SSL certificates for development.

## Generate Local SSL Certificate

Run the following command to create SSL certificates for localhost development:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/localhost-key.pem -out nginx/ssl/localhost.pem -subj "/C=US/ST=CA/L=San Francisco/O=DaySave/OU=Development/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

## What this command does:

- `req -x509`: Creates a self-signed certificate
- `-nodes`: No DES encryption for the private key (no password required)
- `-days 365`: Certificate valid for 365 days
- `-newkey rsa:2048`: Generates a new RSA key with 2048 bits
- `-keyout nginx/ssl/localhost-key.pem`: Output path for the private key
- `-out nginx/ssl/localhost.pem`: Output path for the certificate
- `-subj`: Certificate subject information
- `-addext "subjectAltName=..."`: Adds Subject Alternative Names for localhost and 127.0.0.1

## Prerequisites

Make sure the `nginx/ssl/` directory exists before running this command:

```bash
mkdir -p nginx/ssl
```

## Note

This creates a self-signed certificate suitable for local development only. Browsers will show a security warning that you'll need to accept.
