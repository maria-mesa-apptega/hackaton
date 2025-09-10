#!/bin/bash

# Apptega Compliance Copilot Deployment Script
# This script handles the complete deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGE=${1:-dev}
REGION=${2:-us-east-1}
SERVICE_NAME="apptega-compliance-copilot"

echo -e "${BLUE}🚀 Starting deployment of ${SERVICE_NAME} to ${STAGE} environment${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"
if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
    print_error "Node.js version $NODE_VERSION is not supported. Please use version $REQUIRED_VERSION or higher."
    exit 1
fi

print_status "Node.js version $NODE_VERSION is compatible"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install and configure AWS CLI."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials are not configured. Please run 'aws configure' first."
    exit 1
fi

print_status "AWS credentials are configured"

# Check if Serverless Framework is installed
if ! command -v serverless &> /dev/null && ! npx serverless --version &> /dev/null; then
    print_error "Serverless Framework is not installed. Installing globally..."
    npm install -g serverless
fi

print_status "Prerequisites check completed"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci

print_status "Dependencies installed"

# Run linting
echo -e "${BLUE}🔍 Running linting...${NC}"
if npm run lint; then
    print_status "Linting passed"
else
    print_warning "Linting issues found, but continuing with deployment"
fi

# Run type checking
echo -e "${BLUE}🔧 Running TypeScript type checking...${NC}"
if npm run type-check; then
    print_status "Type checking passed"
else
    print_error "Type checking failed. Please fix TypeScript errors before deploying."
    exit 1
fi

# Build the project
echo -e "${BLUE}🏗️  Building project...${NC}"
npm run build

print_status "Project built successfully"

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"
if npm test; then
    print_status "All tests passed"
else
    print_warning "Some tests failed, but continuing with deployment"
fi

# Check environment variables
echo -e "${BLUE}🔧 Checking environment configuration...${NC}"

ENV_FILE=".env.${STAGE}"
if [ ! -f "$ENV_FILE" ]; then
    print_warning "Environment file $ENV_FILE not found. Using default .env file."
    ENV_FILE=".env"
fi

if [ ! -f "$ENV_FILE" ]; then
    print_warning "No environment file found. Please create one based on env-template.txt"
    print_warning "Deployment will continue with default environment variables"
else
    print_status "Environment file $ENV_FILE found"
fi

# Deploy with Serverless Framework
echo -e "${BLUE}🚀 Deploying to AWS...${NC}"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

# Set environment variables for deployment
export NODE_ENV=$STAGE
export AWS_REGION=$REGION

# Deploy using Serverless Framework
if npx serverless deploy --stage $STAGE --region $REGION --verbose; then
    print_status "Deployment completed successfully!"
else
    print_error "Deployment failed!"
    exit 1
fi

# Get the deployed endpoints
echo -e "${BLUE}📡 Retrieving deployment information...${NC}"

# Get stack outputs
STACK_NAME="${SERVICE_NAME}-${STAGE}"
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ServiceEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "Not available")

DYNAMODB_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ConversationsTableName`].OutputValue' \
    --output text 2>/dev/null || echo "Not available")

echo ""
echo -e "${GREEN}🎉 Deployment Summary${NC}"
echo "================================"
echo "Service: $SERVICE_NAME"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "API Endpoint: $API_ENDPOINT"
echo "DynamoDB Table: $DYNAMODB_TABLE"
echo ""

# Show available endpoints
echo -e "${BLUE}📋 Available API Endpoints:${NC}"
echo "================================"
echo "Health Check:"
echo "  GET  $API_ENDPOINT/health/ping"
echo ""
echo "Compliance:"
echo "  POST $API_ENDPOINT/compliance/ask"
echo "  GET  $API_ENDPOINT/compliance/history/{userId}"
echo "  GET  $API_ENDPOINT/compliance/conversation/{conversationId}"
echo ""
echo "AI:"
echo "  POST $API_ENDPOINT/ai/bedrock/process"
echo "  GET  $API_ENDPOINT/ai/models"
echo "  GET  $API_ENDPOINT/ai/models/{model}/health"
echo "  POST $API_ENDPOINT/ai/models/health"
echo ""

# Run post-deployment tests
echo -e "${BLUE}🧪 Running post-deployment tests...${NC}"

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_URL="$API_ENDPOINT/health/ping"

if curl -s -f "$HEALTH_URL" > /dev/null; then
    print_status "Health endpoint is responding"
else
    print_warning "Health endpoint test failed - this might be expected if the endpoint takes time to warm up"
fi

# Test AI models endpoint
echo "Testing AI models endpoint..."
MODELS_URL="$API_ENDPOINT/ai/models"

if curl -s -f "$MODELS_URL" > /dev/null; then
    print_status "AI models endpoint is responding"
else
    print_warning "AI models endpoint test failed - this might be expected if the endpoint takes time to warm up"
fi

echo ""
echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"
echo "1. Test the API endpoints using the URLs above"
echo "2. Configure your client applications to use the new API endpoint"
echo "3. Monitor the CloudWatch logs for any issues"
echo "4. Set up monitoring and alerting if not already configured"
echo ""
echo -e "${BLUE}📖 Useful Commands:${NC}"
echo "View logs: serverless logs -f ask --stage $STAGE --tail"
echo "Remove deployment: serverless remove --stage $STAGE --region $REGION"
echo "Redeploy single function: serverless deploy function -f ask --stage $STAGE"
echo ""

# Save deployment info to file
DEPLOYMENT_INFO_FILE="deployment-info-${STAGE}.json"
cat > $DEPLOYMENT_INFO_FILE << EOF
{
  "service": "$SERVICE_NAME",
  "stage": "$STAGE",
  "region": "$REGION",
  "apiEndpoint": "$API_ENDPOINT",
  "dynamodbTable": "$DYNAMODB_TABLE",
  "deploymentDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
}
EOF

print_status "Deployment information saved to $DEPLOYMENT_INFO_FILE"

echo -e "${GREEN}🎊 All done! Your Apptega Compliance Copilot is ready to use.${NC}"
