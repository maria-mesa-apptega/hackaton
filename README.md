# Apptega Compliance Copilot

A modern monorepo setup using Turbo.js with Docker support for local development. This project includes the **Apptega Compliance Copilot** - an AI-powered compliance Q&A system using AWS Bedrock.

## 🛡️ Apptega Compliance Copilot

The main feature of this hackathon project is an intelligent compliance assistant that helps users understand SOC2, NIST, ISO 27001, and CIS frameworks using AWS Bedrock (Claude 3.5 Sonnet).

**Quick Start:**
1. Set up AWS credentials in `.env`
2. Run `pnpm run dev`
3. Visit http://localhost:3000
4. Ask compliance questions!

## 🏗️ Project Structure

```
hackaton/
├── apps/
│   ├── client/                    # React + Vite frontend application
│   │   ├── src/
│   │   │   ├── App.tsx           # Main React component with compliance UI
│   │   │   ├── App.css           # Styled compliance interface
│   │   │   ├── main.tsx          # React entry point
│   │   │   └── index.css         # Global styles
│   │   ├── public/               # Static assets
│   │   ├── package.json          # Client dependencies
│   │   ├── vite.config.ts        # Vite configuration
│   │   ├── tsconfig.json         # TypeScript config
│   │   ├── Dockerfile            # Production Docker image
│   │   └── Dockerfile.dev        # Development Docker image
│   └── api/                      # Express.js API with AWS Bedrock integration
│       ├── src/
│       │   ├── index.ts          # Main API server with compliance endpoints
│       │   └── services/         # AWS Bedrock and database services
│       ├── package.json          # API dependencies (AWS SDK, Express, etc.)
│       ├── tsconfig.json         # TypeScript config
│       └── Dockerfile            # API Docker image
├── packages/
│   └── ui/                       # Shared UI components
│       ├── src/
│       │   ├── Button.tsx        # Reusable button component
│       │   ├── Card.tsx          # Reusable card component
│       │   └── index.ts          # Component exports
│       ├── package.json          # UI package dependencies
│       └── tsconfig.json         # TypeScript config
├── docker-compose.yml            # Development environment
├── docker-compose.prod.yml       # Production environment
├── package.json                  # Root package.json with Turbo.js
├── turbo.json                    # Turbo.js configuration
├── .nvmrc                        # Node.js version specification
├── env.example                   # Environment variables template
├── Makefile                      # Development commands
└── README.md                     # This file
```

## 🚀 Quick Start

### Prerequisites

**Required Software:**
- **nvm (Node Version Manager)** - For managing Node.js versions
- **Node.js 18+** - JavaScript runtime (managed via nvm)
- **pnpm 8.0+** - Package manager (faster, more efficient than npm)
- **Docker & Docker Compose** - Containerization
- **AWS Account** - For Bedrock access
- **Git** - Version control

**Why nvm?**
- **Version Management** - Easy switching between Node.js versions
- **Project Isolation** - Different projects can use different Node versions
- **Easy Installation** - Simple setup and updates
- **Cross-platform** - Works on Windows, macOS, and Linux

**Why pnpm?**
- **Faster installs** - Up to 2x faster than npm
- **Disk space efficient** - Uses hard links to avoid duplication
- **Strict dependency resolution** - Prevents phantom dependencies
- **Workspace support** - Better monorepo management

**AWS Prerequisites:**
- AWS Account with Bedrock access
- IAM user with Bedrock permissions
- AWS credentials configured locally

**System Requirements:**
- **RAM:** Minimum 4GB, Recommended 8GB+
- **Storage:** At least 2GB free space
- **OS:** Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Network:** Internet connection for AWS Bedrock API calls

### Development Setup

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd hackaton
   ```

2. **Install Node.js and pnpm:**
   ```bash
   # Install nvm (if not already installed)
   # For Linux/macOS:
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   # For Windows: Download from https://github.com/coreybutler/nvm-windows
   
   # Install and use Node.js 18
   nvm install 18
   nvm use 18
   
   # Install pnpm globally
   npm install -g pnpm@8.0.0
   
   # Install project dependencies
   pnpm install
   ```

3. **Configure environment:**
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Edit .env with your AWS credentials
   nano .env
   ```

4. **Required environment variables:**
   ```bash
   # AWS Configuration for Bedrock
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   
   # API Configuration
   PORT=8000
   NODE_ENV=development
   
   # Client Configuration
   VITE_API_URL=http://localhost:8000
   ```

5. **Start development environment:**
   ```bash
   # Option 1: Start all services with Docker
   docker-compose up

   # Option 2: Start all services locally
   pnpm run dev

   # Option 3: Start individual services
   docker-compose up client    # Client only
   docker-compose up api       # API only
   ```

6. **Access the application:**
   - **Client:** http://localhost:3000
   - **API:** http://localhost:8000
   - **API Health Check:** http://localhost:8000/health
   - **API Documentation:** http://localhost:8000/api

### Local Development (without Docker)

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start development servers:**
   ```bash
   # Start all services
   pnpm run dev

   # Or start individual services
   cd apps/client && pnpm run dev
   cd apps/api && pnpm run dev
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

**Root Level Commands:**
- `pnpm run dev` - Start all services in development mode
- `pnpm run build` - Build all applications
- `pnpm run lint` - Lint all code
- `pnpm run format` - Format code with Prettier
- `pnpm run clean` - Clean all build artifacts
- `pnpm run test:api` - Test API endpoints

**Make Commands (Alternative):**
- `make install` - Install all dependencies
- `make dev` - Start development servers
- `make build` - Build all applications
- `make clean` - Clean build artifacts
- `make docker-up` - Start Docker containers
- `make docker-down` - Stop Docker containers
- `make docker-build` - Build Docker images

**pnpm Workspace Commands:**
- `pnpm -F client dev` - Run dev script in client app only
- `pnpm -F api dev` - Run dev script in API only
- `pnpm -F ui build` - Build UI package only
- `pnpm add <package> -F client` - Add dependency to client app
- `pnpm add <package> -w` - Add dependency to workspace root
- `pnpm list -r` - List all dependencies across workspace

## 🔧 Individual App Scripts

### Client App (`apps/client`)
- `pnpm run dev` - Start Vite dev server (http://localhost:3000)
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Lint client code

### API (`apps/api`)
- `pnpm run dev` - Start with hot reload (http://localhost:8000)
- `pnpm run build` - Build TypeScript
- `pnpm run start` - Start production server
- `pnpm run lint` - Lint API code

### UI Package (`packages/ui`)
- `pnpm run build` - Build shared components
- `pnpm run dev` - Watch mode for development
- `pnpm run lint` - Lint UI components

## 🗄️ Future Database Setup

When ready to add PostgreSQL:

1. Uncomment the postgres service in `docker-compose.yml`
2. Uncomment the api service dependencies
3. Set up database migrations
4. Configure environment variables
5. Install database dependencies: `pnpm add -w mysql2 @types/mysql2`

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
7. Configure pnpm workspaces for better dependency management

## 🔧 Troubleshooting

### Common Issues

**1. AWS Bedrock Access Denied:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

**2. Port Already in Use:**
```bash
# Kill processes on ports 3000 and 8000
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

**3. Docker Issues:**
```bash
# Clean Docker containers and images
docker-compose down --volumes --remove-orphans
docker system prune -a
```

**4. Node.js/nvm Issues:**
```bash
# Check Node.js version
node --version

# Switch to correct Node.js version
nvm use 18

# Install Node.js 18 if not available
nvm install 18

# Set Node.js 18 as default
nvm alias default 18
```

**5. pnpm Issues:**
```bash
# Clear pnpm cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
pnpm install
```

**6. Environment Variables:**
- Ensure `.env` file exists in root directory
- Check AWS credentials are correctly set
- Verify `VITE_API_URL` matches your API port

### Debug Commands

```bash
# Check API health
curl http://localhost:8000/health

# Test compliance endpoint
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is SOC2?"}'

# View Docker logs
docker-compose logs -f client
docker-compose logs -f api
```

## 📝 Notes

- **Client:** Runs on port 3000 with hot reload
- **API:** Runs on port 8000 with AWS Bedrock integration
- **Docker:** All services configured for containerized development
- **TypeScript:** Used throughout the project for type safety
- **nvm:** Node Version Manager for consistent Node.js 18+ environment
- **pnpm:** Package manager for faster, more efficient dependency management
- **AWS Bedrock:** Requires valid AWS credentials and Bedrock access
- **Hot Reloading:** Enabled for both client and API development
- **.nvmrc:** Specifies Node.js version for automatic version switching
