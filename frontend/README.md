# Security Incident Reporting System - Frontend

A modern React-based dashboard for the Security Incident Reporting System, built with TypeScript, Material-UI, and React Query.

## Features

- **Modern UI/UX**: Built with Material-UI v7 for a professional, responsive design
- **TypeScript**: Full type safety and better development experience
- **Authentication**: JWT-based authentication with role-based access control
- **Real-time Data**: React Query for efficient data fetching and caching
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Data Grid**: Advanced data tables with sorting, filtering, and pagination
- **Theme Support**: Light and dark theme support (dark theme ready)
- **Offline Support**: Designed to work with offline deployment modes

## Tech Stack

- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Material-UI v7** - Component library and theming
- **React Query (TanStack Query)** - Data fetching and caching
- **React Router v7** - Client-side routing
- **Axios** - HTTP client
- **Date-fns** - Date manipulation
- **React Hot Toast** - Notifications

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running (see backend README)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   REACT_APP_API_URL=http://localhost:3000
   REACT_APP_DEPLOYMENT_MODE=saas
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3001`

## Available Scripts

- `npm start` - Start development server
- `npm run dev` - Alias for start
- `npm run build` - Build for production
- `npm run build:prod` - Build for production (no source maps)
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── Layout.tsx      # Main layout with navigation
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
├── pages/              # Page components
│   ├── Login.tsx       # Login page
│   ├── Dashboard.tsx   # Dashboard overview
│   ├── Incidents.tsx   # Incidents management
│   └── Areas.tsx       # Areas management
├── services/           # API services
│   └── api.ts         # API client and methods
├── theme/              # Material-UI theme
│   └── index.ts       # Theme configuration
├── types/              # TypeScript type definitions
│   └── index.ts       # Shared types
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── App.tsx            # Main app component
```

## Environment Configuration

### Required Environment Variables

- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_DEPLOYMENT_MODE` - Deployment mode (saas/offline/hybrid)
- `REACT_APP_LICENSE_MODE` - License mode (remote/local_only/offline)

### Optional Environment Variables

- `REACT_APP_APP_NAME` - Application name
- `REACT_APP_VERSION` - Application version
- `REACT_APP_ENABLE_OFFLINE_MODE` - Enable offline features
- `REACT_APP_ENABLE_DEBUG_MODE` - Enable debug mode

## Authentication

The frontend uses JWT-based authentication with automatic token refresh:

- **Login**: Username/password authentication
- **Token Storage**: Secure localStorage with automatic cleanup
- **Token Refresh**: Automatic refresh of expired tokens
- **Role-based Access**: Different UI based on user roles (admin/operator/viewer)

## Deployment Modes

The frontend supports three deployment modes:

### SaaS Mode (Default)
- Full cloud-based deployment
- Remote license validation
- Real-time synchronization

### Offline Mode
- Completely offline operation
- Local license validation
- No internet connectivity required

### Hybrid Mode
- Mixed online/offline operation
- Local fallback when offline
- Synchronization when online

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use functional components with hooks
- Implement proper error handling
- Add loading states for async operations

### Component Structure

```typescript
import React from 'react';
import { ComponentProps } from './types';

interface ComponentProps {
  // Define props
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  
  return (
    // JSX
  );
};

export default Component;
```

### API Integration

- Use React Query for data fetching
- Implement proper error handling
- Add loading and error states
- Use optimistic updates where appropriate

### State Management

- Use React Query for server state
- Use React Context for global UI state
- Use local state for component-specific state
- Avoid prop drilling

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## Building for Production

```bash
# Build for production
npm run build

# Build without source maps (smaller bundle)
npm run build:prod
```

The build output will be in the `build/` directory.

## Docker Support

The frontend can be containerized for deployment:

```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Check `REACT_APP_API_URL` in `.env.local`
   - Ensure backend is running
   - Check CORS configuration

2. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run type-check`
   - Fix linting issues: `npm run lint:fix`

3. **Authentication Issues**
   - Clear browser storage
   - Check JWT token expiration
   - Verify backend authentication endpoints

### Development Tips

- Use React Developer Tools for debugging
- Enable React Query DevTools in development
- Use browser dev tools for network debugging
- Check console for error messages

## Contributing

1. Follow the existing code style
2. Add TypeScript types for new features
3. Implement proper error handling
4. Add loading states for async operations
5. Test your changes thoroughly
6. Update documentation as needed

## License

This project is part of the Security Incident Reporting System. See the main project README for license information.
