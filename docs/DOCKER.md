# Docker Deployment Guide

This guide covers how to build, run, and deploy the App Store MCP Server using Docker.

## Quick Start

### Using Docker Compose (Recommended)

1. **Production deployment:**
   ```bash
   docker-compose up -d
   ```

2. **Development with hot reload:**
   ```bash
   docker-compose --profile dev up -d app-store-mcp-server-dev
   ```

### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t app-store-mcp-server .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name app-store-mcp-server \
     -p 3000:3000 \
     -e NODE_ENV=production \
     app-store-mcp-server
   ```

## Configuration

### Environment Variables

The following environment variables can be used to configure the server:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limiting window in milliseconds (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Maximum requests per window |
| `SCRAPING_TIMEOUT` | `30000` | Scraping operation timeout in milliseconds |
| `SCRAPING_RETRIES` | `3` | Number of retry attempts for failed scraping operations |
| `CORS_ORIGINS` | `*` | Comma-separated list of allowed CORS origins |
| `REQUEST_TIMEOUT` | `60000` | HTTP request timeout in milliseconds |
| `ENABLE_LOGGING` | `true` | Enable/disable request logging |

### Docker Compose Configuration

Create a `.env` file in your project root to customize environment variables:

```bash
# .env file
PORT=3000
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SCRAPING_TIMEOUT=30000
SCRAPING_RETRIES=3
```

## Docker Images

### Multi-stage Build

The Dockerfile uses a multi-stage build process:

1. **Builder stage**: Compiles TypeScript code with all dependencies
2. **Production stage**: Creates minimal runtime image with only production dependencies

### Security Features

- Uses Node.js Alpine base image for minimal attack surface
- Runs as non-root user (`appuser`)
- Includes security headers via Helmet middleware
- Implements proper file permissions

### Health Checks

The container includes built-in health checks:
- **Endpoint**: `GET /health`
- **Interval**: 30 seconds
- **Timeout**: 3 seconds
- **Retries**: 3 attempts
- **Start period**: 5 seconds

## Deployment Scenarios

### Local Development

```bash
# Start development server with hot reload
docker-compose --profile dev up app-store-mcp-server-dev

# View logs
docker-compose logs -f app-store-mcp-server-dev
```

### Production Deployment

```bash
# Start production server
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app-store-mcp-server

# Scale if needed (not typically required for MCP servers)
docker-compose up -d --scale app-store-mcp-server=2
```

### Container Orchestration

#### Docker Swarm

```bash
# Deploy as a service
docker service create \
  --name app-store-mcp-server \
  --publish 3000:3000 \
  --env NODE_ENV=production \
  --env LOG_LEVEL=info \
  --replicas 2 \
  app-store-mcp-server
```

#### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-store-mcp-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app-store-mcp-server
  template:
    metadata:
      labels:
        app: app-store-mcp-server
    spec:
      containers:
      - name: app-store-mcp-server
        image: app-store-mcp-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: app-store-mcp-server-service
spec:
  selector:
    app: app-store-mcp-server
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Monitoring and Logging

### Health Monitoring

Check container health:
```bash
# Docker health status
docker inspect --format='{{.State.Health.Status}}' app-store-mcp-server

# Manual health check
curl http://localhost:3000/health
```

### Log Management

The server outputs structured JSON logs. Configure log aggregation:

```bash
# View real-time logs
docker-compose logs -f app-store-mcp-server

# Export logs to file
docker-compose logs app-store-mcp-server > server.log

# Use log drivers for centralized logging
docker run -d \
  --log-driver=syslog \
  --log-opt syslog-address=tcp://logserver:514 \
  app-store-mcp-server
```

### Metrics Collection

For production deployments, consider adding metrics collection:

```yaml
# docker-compose.yml addition for monitoring
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Change port in docker-compose.yml or use environment variable
   PORT=3001 docker-compose up
   ```

2. **Memory issues:**
   ```bash
   # Increase memory limit
   docker run -m 512m app-store-mcp-server
   ```

3. **Permission errors:**
   ```bash
   # Check file permissions
   ls -la Dockerfile docker-compose.yml
   ```

### Debug Mode

Run container in debug mode:
```bash
docker run -it \
  -e NODE_ENV=development \
  -e LOG_LEVEL=debug \
  -p 3000:3000 \
  app-store-mcp-server
```

### Container Shell Access

Access running container:
```bash
# Get shell access
docker exec -it app-store-mcp-server sh

# Check processes
docker exec app-store-mcp-server ps aux

# Check logs
docker exec app-store-mcp-server cat /proc/1/fd/1
```

## Performance Optimization

### Resource Limits

Set appropriate resource limits:
```yaml
# docker-compose.yml
services:
  app-store-mcp-server:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Build Optimization

Optimize build time:
```bash
# Use build cache
docker build --cache-from app-store-mcp-server .

# Multi-platform builds
docker buildx build --platform linux/amd64,linux/arm64 -t app-store-mcp-server .
```

## Security Considerations

1. **Use specific image tags** instead of `latest`
2. **Scan images** for vulnerabilities:
   ```bash
   docker scan app-store-mcp-server
   ```
3. **Run as non-root** (already configured)
4. **Limit network exposure** using Docker networks
5. **Use secrets management** for sensitive configuration
6. **Regular updates** of base images and dependencies

## Backup and Recovery

### Data Persistence

The MCP server is stateless, but you may want to persist logs:
```yaml
volumes:
  - ./logs:/app/logs
```

### Configuration Backup

Backup your configuration files:
```bash
tar -czf mcp-server-config.tar.gz \
  docker-compose.yml \
  .env \
  Dockerfile \
  .dockerignore
```

## Support

For issues related to Docker deployment:
1. Check container logs: `docker-compose logs app-store-mcp-server`
2. Verify health status: `curl http://localhost:3000/health`
3. Check resource usage: `docker stats app-store-mcp-server`
4. Review configuration: `docker-compose config`