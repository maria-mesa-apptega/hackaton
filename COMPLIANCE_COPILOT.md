# 🛡️ Apptega Compliance Copilot

A hackathon project that provides intelligent compliance Q&A using AWS Bedrock (Claude 3.5 Sonnet) with a modern React frontend and Express.js API.

## 🚀 Features

- **AI-Powered Compliance Assistant**: Ask questions about SOC2, NIST, ISO 27001, and CIS frameworks
- **Structured Responses**: Get executive summaries, technical details, and Apptega-specific actions
- **Modern UI**: Beautiful, responsive interface with real-time chat experience
- **AWS Bedrock Integration**: Powered by Claude 3.5 Sonnet for intelligent responses
- **Lambda Ready**: API designed for easy AWS Lambda deployment

## 🏗️ Architecture

```
User → React Frontend → Express API → AWS Bedrock (Claude 3.5 Sonnet)
```

### Components

1. **Frontend** (`apps/client/`): React + Vite application with modern UI
2. **API** (`apps/api/`): Express.js server with Bedrock integration
3. **Bedrock Service**: Handles AI model interactions and response parsing

## 🛠️ Setup Instructions

### Prerequisites

1. **AWS Account** with Bedrock access
2. **IAM Role** with permissions:
   - `bedrock:InvokeModel`
   - `logs:CreateLogGroup`
   - `logs:CreateLogStream`
   - `logs:PutLogEvents`

3. **Node.js 18+** and **npm**

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd hackaton
   npm install
   ```

2. **Configure AWS credentials:**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your AWS credentials
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   ```

3. **Start the development servers:**
   ```bash
   # Start both frontend and API
   npm run dev
   
   # Or start individually
   cd apps/api && npm run dev    # API on port 8000
   cd apps/client && npm run dev # Frontend on port 3000
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000

## 🔧 API Endpoints

### POST /ask
Ask a compliance question and get a structured response.

**Request:**
```json
{
  "question": "What are the SOC2 requirements for data encryption?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executiveSummary": "SOC2 requires encryption of data at rest and in transit...",
    "technicalDetails": [
      "AES-256 encryption for data at rest",
      "TLS 1.2+ for data in transit",
      "Key management procedures"
    ],
    "apptegaActions": [
      "Configure encryption settings in Apptega platform",
      "Set up data classification policies",
      "Enable audit logging for encryption events"
    ],
    "disclaimer": "This information is for educational purposes only..."
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /health
Health check endpoint.

### GET /api
API information and available endpoints.

## 🎯 Usage Examples

Try asking these questions:

- "What are the SOC2 requirements for data encryption?"
- "How do I implement NIST cybersecurity framework controls?"
- "What's the difference between ISO 27001 and SOC2?"
- "What CIS controls should I prioritize for cloud security?"
- "How do I prepare for a SOC2 audit?"

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Docker Deployment
```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up --build
```

### AWS Lambda Deployment
The API is designed for Lambda deployment. Use AWS SAM or Serverless Framework:

```yaml
# serverless.yml example
functions:
  compliance-api:
    handler: dist/index.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
```

## 🔒 Security Considerations

- AWS credentials should be stored securely (AWS IAM roles recommended)
- CORS is configured for development (restrict in production)
- No authentication implemented (add for production use)
- All responses include disclaimers for compliance guidance

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Frontend API URL | `http://localhost:8000` |
| `PORT` | API server port | `8000` |
| `NODE_ENV` | Environment | `development` |
| `AWS_REGION` | AWS region for Bedrock | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | Required |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required |

## 🧪 Testing

Test the API directly:

```bash
# Health check
curl http://localhost:8000/health

# Ask a question
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is SOC2?"}'
```

## 🎨 Customization

### System Prompt
Edit `apps/api/src/services/bedrockService.ts` to modify the AI behavior:

```typescript
const SYSTEM_PROMPT = `Your custom compliance assistant prompt...`;
```

### UI Styling
Modify `apps/client/src/App.css` for custom styling.

### Response Format
Update the `parseComplianceResponse` function to change response structure.

## 🐛 Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   - Ensure AWS credentials are properly configured
   - Check IAM permissions for Bedrock access

2. **CORS Errors**
   - Verify API is running on correct port
   - Check CORS configuration in API

3. **Bedrock Model Not Available**
   - Ensure Claude 3.5 Sonnet is available in your AWS region
   - Check Bedrock model access permissions

4. **Frontend Not Loading**
   - Verify VITE_API_URL matches API port
   - Check browser console for errors

## 📚 Framework Knowledge

The copilot is trained on these compliance frameworks:

- **SOC 2**: Service Organization Control 2 for service providers
- **NIST**: National Institute of Standards and Technology cybersecurity framework
- **ISO 27001**: International standard for information security management
- **CIS**: Center for Internet Security controls and benchmarks

## 🤝 Contributing

This is a hackathon project. For production use:

1. Add proper authentication
2. Implement rate limiting
3. Add comprehensive error handling
4. Set up monitoring and logging
5. Add unit and integration tests

## 📄 License

Built for Apptega Hackathon - Internal Use Only

---

**Built with ❤️ for the Apptega Hackathon**
