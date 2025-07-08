# Port Configuration Guide

This document outlines the port configuration for the Security Incident Reporting System across all components.

## Default Port Configuration

### Development Environment

| Component | Port | URL | Purpose |
|-----------|------|-----|---------|
| **Frontend (React)** | 3000 | http://localhost:3000 | React development server |
| **Backend (Node.js)** | 3001 | http://localhost:3001 | Express API server |
| **PostgreSQL** | 5432 | localhost:5432 | Database server |
| **Electron** | N/A | N/A | Desktop application |

### Production Environment

| Component | Port | URL | Purpose |
|-----------|------|-----|---------|
| **Frontend** | 80/443 | https://your-domain.com | Production web app |
| **Backend** | 3001 | https://api.your-domain.com | Production API |
| **PostgreSQL** | 5432 | your-db-host:5432 | Production database |

## Environment File Configuration

### Backend (.env)

```bash
# Server Configuration
PORT=3001
HOST=0.0.0.0

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
CORS_CREDENTIALS=true

# API Configuration
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001

# Application Configuration
REACT_APP_APP_NAME=Security Incident Reporting System
REACT_APP_VERSION=1.0.0
```

## Deployment Modes

### 1. Development Mode
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Database: `localhost:5432`

### 2. SaaS Mode
- Frontend: `https://app.your-domain.com`
- Backend: `https://api.your-domain.com`
- Database: Managed PostgreSQL service

### 3. Offline Mode
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Database: `localhost:5432`

### 4. Hybrid Mode
- Frontend: `http://localhost:3000` (local) + `https://app.your-domain.com` (remote)
- Backend: `http://localhost:3001` (local) + `https://api.your-domain.com` (remote)
- Database: `localhost:5432` (local) + Remote database (sync)

## Starting the System

### Development Setup

1. **Start Backend:**
   ```bash
   cd backend
   PORT=3001 node src/server.js
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Start Database (if not running):**
   ```bash
   # Install PostgreSQL if needed
   brew install postgresql@14
   brew services start postgresql@14
   ```

### Docker Setup

```bash
# Start all services
docker-compose up -d

# Or start specific services
docker-compose --profile saas up -d
docker-compose --profile offline up -d
docker-compose --profile hybrid up -d
```

## Troubleshooting

### Port Conflicts

If you encounter port conflicts:

1. **Check what's running on a port:**
   ```bash
   lsof -i :3000
   lsof -i :3001
   ```

2. **Kill processes using a port:**
   ```bash
   lsof -ti:3000 | xargs kill -9
   lsof -ti:3001 | xargs kill -9
   ```

3. **Use different ports:**
   ```bash
   # Backend on different port
   PORT=3002 node src/server.js
   
   # Frontend on different port
   PORT=3003 npm start
   ```

### Database Connection Issues

1. **Check if PostgreSQL is running:**
   ```bash
   brew services list | grep postgresql
   ```

2. **Start PostgreSQL:**
   ```bash
   brew services start postgresql@14
   ```

3. **Create database and user:**
   ```bash
   createdb screenshot_db
   createuser screenshot_user
   ```

## Environment Variables Reference

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Backend server port |
| `HOST` | 0.0.0.0 | Backend server host |
| `DB_HOST` | localhost | Database host |
| `DB_PORT` | 5432 | Database port |
| `CORS_ORIGIN` | http://localhost:3000,http://localhost:3001 | Allowed CORS origins |

### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | http://localhost:3001 | Backend API URL |
| `REACT_APP_ENVIRONMENT` | development | Environment mode |
| `REACT_APP_VERSION` | 1.0.0 | Application version |

## Security Considerations

1. **CORS Configuration:** Ensure CORS origins are properly configured for your deployment
2. **Database Security:** Use strong passwords and SSL connections in production
3. **API Security:** Implement proper authentication and rate limiting
4. **Environment Variables:** Never commit sensitive environment variables to version control

## Quick Start Commands

```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Start backend
cd backend && PORT=3001 node src/server.js &

# Start frontend
cd frontend && npm start &

# Check if services are running
curl http://localhost:3001/health
curl http://localhost:3000
``` 