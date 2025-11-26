# Reverse Proxy (NGINX)

## Overview
This directory contains the configuration for the NGINX reverse proxy that sits in front of the FluxConvert application.

## Role
*   **Routing**: Routes requests to the Frontend (Next.js) or API Gateway (NestJS).
*   **Load Balancing**: Can be configured to load balance across multiple instances.
*   **Security**: Hides internal service ports and structure.
*   **Performance**: Handles Gzip compression and static asset caching (if configured).

## Configuration
The `nginx.conf` defines:
*   `upstream web_upstream`: Points to the `web` service on port 3000.
*   `upstream api_upstream`: Points to the `api` service on port 3000.
*   `location /`: Proxies to the frontend.
*   `location /api/`: Proxies to the API Gateway (stripping the `/api` prefix).

## Usage
This service is automatically started by `docker-compose up`. It exposes port **80** on the host machine.

## Customization
To add SSL/TLS, mount your certificates and update the `server` block to listen on 443.
