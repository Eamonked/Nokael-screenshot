# Security Incident Reporting System

A production-grade, secure incident reporting system with screenshot capture capabilities, license management, and comprehensive audit logging.

## 🏗️ Architecture

```mermaid
graph TD
  subgraph Client
    Electron[Electron App]
    React[React Dashboard]
  end
  subgraph Backend
    Nginx[Nginx (HTTPS, Reverse Proxy)]
    Express[Node.js Express API]
    S3[(S3 or Local Storage)]
    Postgres[(PostgreSQL DB)]
    License[License Server API]
  end

  Electron -- loads --> React
  Electron -- native features --> React
  Electron -- license activation --> License
  React -- REST API (JWT) --> Nginx
  Nginx -- forwards --> Express
  Express -- stores files --> S3
  Express -- stores data --> Postgres
  Express -- serves files --> S3
  Nginx -- HTTPS --> Client
  License -- stores --> Postgres
```

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with 2-hour expiry
- Role-based access control (admin, operator, viewer)
- bcrypt password hashing
- Secure session management

### 🚨 Incident Management
- Create, view, update, and manage security incidents
- Screenshot capture and storage
- Status workflow (open, in-progress, closed, archived)
- Area-based organization
- Full audit trail

### 🔑 License Management
- License key generation and activation
- Workstation-based licensing
- Automatic license validation
- Customer management

### 📊 Audit & Compliance
- Comprehensive audit logging
- User activity tracking
- Security event monitoring
- Compliance reporting

### 🛡️ Security Features
- HTTPS enforcement
- Rate limiting and DDoS protection
- Input validation and sanitization
- File upload security
- SQL injection prevention
- XSS protection

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- PostgreSQL 15+ (for development)

### Deployment Modes

The system supports three deployment modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| **SaaS** | Multi-tenant cloud deployment | Most customers, centralized management |
| **Offline** | Single-tenant local deployment | High-security clients, government, banks |
| **Hybrid** | Single-tenant with sync capability | Field operations, intermittent connectivity |

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Screenshot
```

### 2. Choose Your Deployment Mode

#### Option A: SaaS Deployment (Recommended)
```bash
# Copy SaaS environment template
cp backend/env.saas.example backend/.env

# Edit configuration for your SaaS environment
nano backend/.env

# Deploy using SaaS configuration
cd devops
./deploy-saas.sh production
```

#### Option B: Offline Deployment
```bash
# Copy offline environment template
cp backend/env.offline.example backend/.env

# Edit configuration for your offline environment
nano backend/.env

# Deploy using offline configuration
cd devops
./deploy-offline.sh production
```

#### Option C: Hybrid Deployment
```bash
# Copy hybrid environment template
cp backend/env.hybrid.example backend/.env

# Edit configuration for your hybrid environment
nano backend/.env

# Deploy using hybrid configuration
cd devops
./deploy-hybrid.sh production
```

### 3. Environment Configuration

Each deployment mode has specific requirements:

#### SaaS Mode Requirements
- `DB_URL`: PostgreSQL connection string
- `LICENSE_SERVER_URL`: Remote license server
- `API_URL`: Public API endpoint
- `JWT_SECRET`: Secure JWT secret

#### Offline Mode Requirements
- `DB_HOST`: Local PostgreSQL host
- `OFFLINE_LICENSE_KEY`: Pre-approved license key
- `JWT_SECRET`: Secure JWT secret

#### Hybrid Mode Requirements
- `DB_HOST`: Local PostgreSQL host
- `LICENSE_SERVER_URL`: Remote license server
- `SYNC_ENABLED=true`: Enable sync functionality
- `REMOTE_API_URL`: Remote API for sync

### 4. Access the Application

After deployment, access your application:

- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Nginx**: http://localhost:80 (HTTP) / https://localhost:443 (HTTPS)
- **Default Admin**: `admin` / `Admin123!`

## 📁 Project Structure

```
Screenshot/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── database/       # Database connection and migrations
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic services
│   │   │   ├── configService.js  # Deployment mode configuration
│   │   │   └── auditService.js   # Audit logging service
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Express server setup
│   ├── env.saas.example    # SaaS deployment configuration
│   ├── env.offline.example # Offline deployment configuration
│   ├── env.hybrid.example  # Hybrid deployment configuration
│   ├── Dockerfile          # Backend container
│   └── package.json
├── devops/                 # Infrastructure and deployment
│   ├── docker-compose.yml  # SaaS deployment configuration
│   ├── docker-compose.offline.yml  # Offline deployment configuration
│   ├── docker-compose.hybrid.yml   # Hybrid deployment configuration
│   ├── deploy-saas.sh      # SaaS deployment script
│   ├── deploy-offline.sh   # Offline deployment script
│   ├── deploy-hybrid.sh    # Hybrid deployment script
│   ├── nginx/             # Reverse proxy configuration
│   └── backup/            # Database backup scripts
├── scripts/               # CLI tools and utilities
│   └── generateLicenseKey.js
└── shared/               # Shared types and constants
    └── types/
        └── index.js      # Deployment modes and configuration types
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=screenshot_db
DB_USER=screenshot_user
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=2h
JWT_REFRESH_SECRET=your_refresh_secret_key

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📚 API Documentation

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!"
}
```

#### Response
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin",
      "role": "admin"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Incidents

#### Create Incident
```http
POST /api/incidents
Authorization: Bearer <token>
Content-Type: application/json

{
  "areaId": "550e8400-e29b-41d4-a716-446655440001",
  "description": "Suspicious network activity detected",
  "timestamp": "2024-01-15T10:30:00Z",
  "screenshotPath": "2024/01/screenshot_123456.jpg"
}
```

#### List Incidents
```http
GET /api/incidents?page=1&limit=20&status=open
Authorization: Bearer <token>
```

### License Management

#### Activate License
```http
POST /api/license/activate
Content-Type: application/json

{
  "licenseKey": "DEMO-XXXX-YYYY-ZZZZ-1234",
  "workstationId": "WS-001",
  "hostname": "workstation-001"
}
```

#### Check License Status
```http
GET /api/license/status?licenseKey=DEMO-XXXX-YYYY-ZZZZ-1234&workstationId=WS-001
```

## 🛠️ Admin Tools

### License Key Generation
```bash
# Command line
node scripts/generateLicenseKey.js <customer_id> [max_activations] [expires_at]

# Interactive mode
node scripts/generateLicenseKey.js --interactive
```

### Database Backup
```bash
# Manual backup
./devops/backup/backup.sh

# Restore from backup
./devops/backup/restore.sh backup_20240115_143022.sql
```

## 🐳 Docker Deployment

### Production Deployment
```bash
# Build and start all services
docker-compose -f devops/docker-compose.yml up -d

# View logs
docker-compose -f devops/docker-compose.yml logs -f

# Stop services
docker-compose -f devops/docker-compose.yml down
```

### SSL Certificate Setup
1. Place your SSL certificates in `devops/nginx/certs/`
2. Update `devops/nginx/nginx.conf` if needed
3. Restart the nginx container

## 🔒 Security Considerations

### Production Checklist
- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Enable database SSL
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerting
- [ ] Review and update CORS settings
- [ ] Configure rate limiting
- [ ] Set up audit log retention

### Security Features
- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive validation middleware
- **File Upload**: Secure file handling with type checking
- **Rate Limiting**: API rate limiting and DDoS protection
- **Audit Logging**: Complete activity tracking
- **HTTPS**: Enforced HTTPS with security headers
- **SQL Injection**: Parameterized queries
- **XSS Protection**: Content Security Policy headers

## 📊 Monitoring & Maintenance

### Health Checks
- **API Health**: `GET /health`
- **Database**: Automatic connection monitoring
- **File System**: Upload directory monitoring

### Logs
- **Application Logs**: `backend/logs/`
- **Nginx Logs**: `devops/nginx/logs/`
- **Database Logs**: PostgreSQL logs

### Backup Strategy
- **Automated Backups**: Daily database backups
- **Retention**: 30-day backup retention
- **Verification**: Backup integrity checks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the audit logs for troubleshooting

## 🔄 Updates

### Version History
- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Added license management system
- **v1.2.0**: Enhanced security features and audit logging

### Upcoming Features
- React frontend dashboard
- Electron desktop client
- Advanced reporting and analytics
- Multi-tenant support
- API rate limiting dashboard
- Mobile application

---

**⚠️ Security Notice**: This is a security-critical application. Always follow security best practices and keep the system updated with the latest security patches. 