# Certificate Backup

This folder contains backup copies of SSL certificates used by the DaySave application.

## Files

- `localhost.pem` - Self-signed SSL certificate for localhost development
- `localhost-key.pem` - Private key for the localhost certificate

## Certificate Details

- **Issuer**: C=US, ST=CA, L=San Francisco, O=DaySave, OU=Development, CN=localhost
- **Subject**: C=US, ST=CA, L=San Francisco, O=DaySave, OU=Development, CN=localhost
- **Valid From**: Aug 14 18:51:37 2025 GMT
- **Valid Until**: Aug 14 18:51:37 2026 GMT

## Usage

These certificates are used for local HTTPS development. They are self-signed certificates suitable for development environments only.

## Backup Date

Certificates backed up on: August 18, 2025

## Source

Certificates were copied from the `daysave-nginx-local` Docker container at `/etc/nginx/ssl/`
