# FluxConvert Infrastructure & Deployment Guide

## Overview
This document explains the infrastructure setup for FluxConvert, a microservices-based file conversion platform. The system is orchestrated using Docker Compose and consists of a Next.js frontend, NestJS API Gateway, and multiple Python microservices.

## Architecture
*   **Reverse Proxy (NGINX)**: Entry point (Port 80). Routes traffic to Frontend or API.
*   **Frontend (Next.js)**: User interface (Port 3000 internal).
*   **API Gateway (NestJS)**: Orchestrator (Port 3000 internal). Handles validation and routing.
*   **Microservices (Python)**:
    *   `ocr-service` (8001): PaddleOCR
    *   `bg-remove-service` (8002): rembg
    *   `enhance-service` (8003): OpenCV
    *   `pdf-service` (8004): pikepdf

## Prerequisites
*   Docker
*   Docker Compose

## Quick Start
1.  **Clone the repository**.
2.  **Environment Variables**: Copy `.env.example` to `.env` (optional, defaults in docker-compose work).
3.  **Run**:
    ```bash
    docker compose up --build
    ```
4.  **Access**: Open `http://localhost` in your browser.

## Commands
*   **Start**: `docker compose up -d` (detached mode)
*   **Stop**: `docker compose down`
*   **Logs**: `docker compose logs -f`
*   **Rebuild specific service**: `docker compose up -d --build api`

## Networking
All services communicate over an internal bridge network `flux_network`.
*   Frontend talks to API via NGINX (`/api` proxy).
*   API talks to Microservices via DNS names (`http://ocr-service:8001`).

## Production Notes
*   **Scaling**: You can scale stateless services:
    ```bash
    docker compose up -d --scale ocr-service=3
    ```
    *Note: You'll need to update NGINX upstream config to load balance if scaling this way, or use a swarm/k8s setup.*
*   **Resource Limits**: In a real production environment, add `deploy.resources` limits to `docker-compose.yml` to prevent OOM kills.
*   **Kubernetes**: This setup maps 1:1 to K8s Pods and Services.
*   **Database**: Currently no DB is used. If added (e.g., Postgres/Redis), add a service entry and volume for persistence.

## Troubleshooting
*   **Port Conflicts**: Ensure ports 80, 3000, 8001-8004 are free or modify `docker-compose.yml` port mappings.
*   **Build Failures**: Check `Dockerfile` in the respective service folder.
*   **Health Checks**: Use `docker ps` to see health status.
