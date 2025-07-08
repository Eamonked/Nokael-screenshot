# 🧪 Backend Test Kit - Security Incident Reporting System

## Overview

This test kit allows you to quickly verify the backend functionality across all three deployment modes:
- **SaaS**: Multi-tenant cloud deployment
- **Offline**: Single-tenant local deployment  
- **Hybrid**: Single-tenant with sync capabilities

## 🚀 Quick Start

### 1. Automated Testing (Recommended)

```bash
# Test all modes
cd scripts
./test-backend.sh all

# Test specific mode
./test-backend.sh saas
./test-backend.sh offline
./test-backend.sh hybrid
```

### 2. Manual Testing with Postman

1. Import the Postman collection:
   ```
   scripts/Security_Incident_API.postman_collection.json
   ```

2. Set up environment variables in Postman:
   - `base_url`: `http://localhost:3000`
   - `admin_username`: `admin`
   - `admin_password`: `Admin123!`
   - `test_license_key`: `TEST-XXXX-YYYY-ZZZZ-1234`

3. Start the backend in your desired mode and run the collection

## 📋 Test Environment Setup

### Environment Files

Each deployment mode has its own test environment:

| Mode | Environment File | Description |
|------|------------------|-------------|
| **SaaS** | `backend/env.saas.test` | Multi-tenant with remote license |
| **Offline** | `backend/env.offline.test` | Single-tenant with local license |
| **Hybrid** | `backend/env.hybrid.test` | Single-tenant with sync enabled |

### Manual Environment Setup

```bash
# SaaS Mode
cp backend/env.saas.test backend/.env
cd devops
docker-compose up -d

# Offline Mode  
cp backend/env.offline.test backend/.env
cd devops
docker-compose -f docker-compose.offline.yml up -d

# Hybrid Mode
cp backend/env.hybrid.test backend/.env
cd devops
docker-compose -f docker-compose.hybrid.yml up -d
```

## 🔍 API Testing Checklist

### ✅ Authentication Tests
- [ ] Login with admin credentials
- [ ] JWT token generation
- [ ] Token refresh
- [ ] Logout functionality

### ✅ License Management Tests
- [ ] License activation
- [ ] License status check
- [ ] License validation (mode-specific)
- [ ] License listing (admin only)

### ✅ Incident Management Tests
- [ ] Create incident with screenshot
- [ ] List incidents with pagination
- [ ] Get incident by ID
- [ ] Update incident status
- [ ] File upload handling

### ✅ Area Management Tests
- [ ] List areas
- [ ] Create new area
- [ ] Update area details
- [ ] Deactivate area

### ✅ User Management Tests
- [ ] List users (admin only)
- [ ] Create new user
- [ ] Update user details
- [ ] Deactivate user

### ✅ Audit Logging Tests
- [ ] View audit logs
- [ ] Filter by action/resource
- [ ] Audit statistics
- [ ] Log retention

## 🧪 Manual cURL Testing

### 1. Health Check
```bash
curl -X GET http://localhost:3000/health
```

### 2. Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}'

# Extract JWT token from response
JWT_TOKEN="your_jwt_token_here"
```

### 3. License Activation
```bash
curl -X POST http://localhost:3000/api/license/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "license_key": "TEST-XXXX-YYYY-ZZZZ-1234",
    "workstation_id": "TEST-WORKSTATION-001",
    "hostname": "test-host-01"
  }'
```

### 4. Create Incident
```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "area=Test Area A1" \
  -F "description=Test incident from cURL" \
  -F "screenshot=@test_screenshot.jpg"
```

### 5. List Incidents
```bash
curl -X GET http://localhost:3000/api/incidents \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 🔧 Expected Behavior by Mode

### SaaS Mode
| Feature | Expected Behavior |
|---------|-------------------|
| License Check | ✅ Remote validation |
| File Storage | ✅ S3 (if configured) |
| Database | ✅ Shared multi-tenant |
| Sync | ❌ Disabled |
| Offline Mode | ❌ Disabled |

### Offline Mode
| Feature | Expected Behavior |
|---------|-------------------|
| License Check | ❌ Local validation only |
| File Storage | ✅ Local disk |
| Database | ✅ Local single-tenant |
| Sync | ❌ Disabled |
| Offline Mode | ✅ Enabled |

### Hybrid Mode
| Feature | Expected Behavior |
|---------|-------------------|
| License Check | ✅ Remote with fallback |
| File Storage | ✅ Local disk |
| Database | ✅ Local single-tenant |
| Sync | ✅ Enabled |
| Offline Mode | ✅ Enabled |

## 🐛 Troubleshooting

### Common Issues

1. **Service not starting**
   ```bash
   # Check logs
   docker-compose -f devops/docker-compose.yml logs backend
   
   # Restart services
   docker-compose -f devops/docker-compose.yml down -v
   docker-compose -f devops/docker-compose.yml --profile <mode> up -d
   ```

2. **Database connection issues**
   ```bash
   # Check database status
   docker-compose -f devops/docker-compose.yml ps postgres
   
   # Run migrations manually
   docker-compose -f devops/docker-compose.yml exec backend npm run migrate
   ```

3. **Authentication failures**
   - Verify admin credentials: `admin` / `Admin123!`
   - Check JWT secret in environment file
   - Ensure database is seeded

4. **File upload issues**
   - Check upload directory permissions
   - Verify file size limits
   - Check allowed file types

### Debug Mode

Enable debug logging by setting in environment file:
```bash
LOG_LEVEL=debug
```

## 📊 Test Results Validation

### Success Criteria
- ✅ All API endpoints return 200/201 status codes
- ✅ JWT authentication works correctly
- ✅ File uploads are processed successfully
- ✅ Database operations complete without errors
- ✅ Audit logging captures all actions
- ✅ License validation works per mode

### Performance Benchmarks
- API response time: < 500ms
- File upload: < 5MB in < 10s
- Database queries: < 100ms
- Concurrent users: 10+ simultaneous

## 🧹 Cleanup

After testing, clean up resources:

```bash
# Stop all services
docker-compose -f devops/docker-compose.yml down -v

# Remove test files
rm -f backend/test_screenshot.jpg
rm -f backend/license.key

# Clean Docker images (optional)
docker system prune -f
```

## 📝 Test Report Template

After running tests, document results:

```markdown
# Test Report - [Date]

## Environment
- Mode: [SaaS/Offline/Hybrid]
- Version: [Backend version]
- Database: [PostgreSQL version]

## Test Results
- Authentication: ✅/❌
- License Management: ✅/❌
- Incident Management: ✅/❌
- File Upload: ✅/❌
- Audit Logging: ✅/❌

## Issues Found
- [List any issues]

## Performance
- Average response time: [ms]
- File upload speed: [MB/s]
- Database performance: [ms]

## Recommendations
- [Any recommendations]
```

## 🎯 Next Steps

After successful backend testing:

1. **Frontend Development**: Proceed with React dashboard
2. **Electron Client**: Build offline-capable desktop app
3. **Production Deployment**: Use production environment files
4. **Monitoring**: Set up logging and monitoring
5. **Security Audit**: Conduct security review

---

**Need Help?** Check the main README.md for detailed documentation and troubleshooting guides. 