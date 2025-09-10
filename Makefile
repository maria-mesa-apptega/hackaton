# Hackaton Turbo.js Monorepo Makefile

.PHONY: help install dev build clean docker-up docker-down docker-build

# Default target
help:
	@echo "Available commands:"
	@echo "  install     - Install all dependencies"
	@echo "  dev         - Start development servers"
	@echo "  build       - Build all applications"
	@echo "  clean       - Clean build artifacts"
	@echo "  docker-up   - Start Docker containers"
	@echo "  docker-down - Stop Docker containers"
	@echo "  docker-build - Build Docker images"

# Install dependencies
install:
	npm install

# Start development servers
dev:
	npm run dev

# Build all applications
build:
	npm run build

# Clean build artifacts
clean:
	npm run clean

# Docker commands
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build

# Client specific commands
client-dev:
	cd apps/client && npm run dev

client-build:
	cd apps/client && npm run build

# API specific commands
api-dev:
	cd apps/api && npm run dev

api-build:
	cd apps/api && npm run build

# Production Docker
prod-up:
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down
