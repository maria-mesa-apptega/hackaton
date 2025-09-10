# Hackaton Turbo.js Monorepo

A modern monorepo setup using Turbo.js with Docker support for local development. This project includes the **Apptega Compliance Copilot** - an AI-powered compliance Q&A system using AWS Bedrock.

## 🛡️ Apptega Compliance Copilot

The main feature of this hackathon project is an intelligent compliance assistant that helps users understand SOC2, NIST, ISO 27001, and CIS frameworks using AWS Bedrock (Claude 3.5 Sonnet).

**Quick Start:**
1. Set up AWS credentials in `.env`
2. Run `npm run dev`
3. Visit http://localhost:3000
4. Ask compliance questions!

See [COMPLIANCE_COPILOT.md](./COMPLIANCE_COPILOT.md) for detailed documentation.

## 🏗️ Project Structure

```
hackaton/
├── apps/
│   ├── client/          # React + Vite frontend application
│   └── api/             # Express.js API (future Lambda deployment)
├── packages/
│   └── ui/              # Shared UI components
├── docker-compose.yml   # Development environment
├── docker-compose.prod.yml # Production environment
└── turbo.json          # Turbo.js configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development environment:**
   ```bash
   # Start client in Docker container
   docker-compose up client

   # Or start all services (when available)
   docker-compose up
   ```

3. **Access the application:**
   - Client: http://localhost:3000
   - API: http://localhost:8000 (when enabled)

### Local Development (without Docker)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development servers:**
   ```bash
   # Start all services
   npm run dev

   # Or start individual services
   cd apps/client && npm run dev
   cd apps/api && npm run dev
   ```

## 🐳 Docker Commands

### Development
```bash
# Start client in development mode with hot reload
docker-compose up client

# Build and start client
docker-compose up --build client

# View logs
docker-compose logs -f client
```

### Production
```bash
# Build and start production environment
docker-compose -f docker-compose.prod.yml up --build
```

## 📦 Available Scripts

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all applications
- `npm run lint` - Lint all code
- `npm run format` - Format code with Prettier
- `npm run clean` - Clean all build artifacts

## 🔧 Individual App Scripts

### Client App (`apps/client`)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### API (`apps/api`)
- `npm run dev` - Start with hot reload
- `npm run build` - Build TypeScript
- `npm run start` - Start production server

## 🗄️ Future Database Setup

When ready to add PostgreSQL:

1. Uncomment the postgres service in `docker-compose.yml`
2. Uncomment the api service dependencies
3. Set up database migrations
4. Configure environment variables

## ☁️ Future Lambda Deployment

The API is structured for easy Lambda deployment:

1. The `handler` function in `apps/api/src/index.ts` is Lambda-ready
2. Use AWS SAM or Serverless Framework for deployment
3. Environment variables can be configured in AWS Lambda

## 🛠️ Development Workflow

1. **Make changes** to any app in the `apps/` directory
2. **Hot reload** is enabled for both client and API
3. **Shared components** can be added to `packages/ui/`
4. **TypeScript** is configured across all packages
5. **ESLint** ensures code quality

## 📁 Key Files

- `turbo.json` - Turbo.js configuration
- `docker-compose.yml` - Development Docker setup
- `apps/client/Dockerfile.dev` - Client development container
- `apps/api/Dockerfile` - API production container
- `packages/ui/` - Shared UI components

## 🔮 Next Steps

1. Add PostgreSQL database
2. Implement API endpoints
3. Add authentication
4. Deploy to AWS Lambda
5. Set up CI/CD pipeline
6. Add testing framework

## 📝 Notes

- The client runs on port 3000
- The API runs on port 8000
- All services are configured for Docker networking
- TypeScript is used throughout the project
- Hot reloading is enabled for development
