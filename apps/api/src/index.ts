import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { askComplianceQuestion } from './services/bedrockService.js';
import { testConnection } from './services/prismaService.js';

const prisma = new PrismaClient();

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '8000');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'hackaton-api',
    database: dbConnected ? 'connected' : 'disconnected',
    dbPort: process.env.DB_PORT || '13306 (default)',
    dbHost: process.env.DB_HOST || 'localhost (default)'
  });
});

// API routes placeholder
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Welcome to Apptega Compliance Copilot API',
    version: '1.0.0',
    endpoints: [
      'GET /health - Health check',
      'GET /api - API info',
      'POST /ask - Ask compliance questions',
      'GET /db/explore - Explore database structure'
    ]
  });
});

// Database explorer endpoint
app.get('/db/explore', async (req, res) => {
  try {
    // Get framework data using Prisma
    const frameworks = await prisma.framework.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        organization_id: true,
        is_visible: true,
        deprecated: true
      }
    });
    
    // Get framework count
    const frameworkCount = await prisma.framework.count({
      where: {
        is_visible: true,
        deprecated: false
      }
    });
    
    res.json({
      success: true,
      database: 'apptega (via Prisma)',
      totalFrameworks: frameworkCount,
      sampleFrameworks: frameworks,
      message: 'Using Prisma ORM for database access'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Compliance Q&A endpoint
app.post('/ask', async (req, res) => {
  const startTime = Date.now();
  try {
    const { question, organizationId } = req.body;
    
    if (!question) {
      return res.status(400).json({ 
        error: 'Question is required',
        message: 'Please provide a question in the request body'
      });
    }

    console.log('Received compliance question:', question);
    console.log('Organization ID:', organizationId || 'Not provided');
    
    const response = await askComplianceQuestion(question, organizationId);
    const responseTime = Date.now() - startTime;
    
    // Log analytics
    console.log(`Response generated in ${responseTime}ms`);
    console.log(`Response sections: Executive=${!!response.executiveSummary}, Technical=${response.technicalDetails.length}, Actions=${response.apptegaActions.length}`);
    
    return res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      analytics: {
        responseTime: `${responseTime}ms`,
        sectionsGenerated: {
          executive: !!response.executiveSummary,
          technical: response.technicalDetails.length,
          actions: response.apptegaActions.length
        }
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Error processing compliance question:', error);
    console.log(`Error occurred after ${responseTime}ms`);
    
    // Determine error type and provide specific messages
    let errorMessage = 'Unknown error occurred';
    let errorType = 'UNKNOWN_ERROR';
    
    if (error instanceof Error) {
      if (error.message.includes('UnrecognizedClientException')) {
        errorMessage = 'AWS Bedrock authentication failed. Please check your AWS credentials and permissions.';
        errorType = 'AWS_AUTH_ERROR';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Database connection failed. Please check if the database is running.';
        errorType = 'DATABASE_CONNECTION_ERROR';
      } else if (error.message.includes('CredentialsProviderError')) {
        errorMessage = 'AWS credentials not found. Please configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.';
        errorType = 'AWS_CREDENTIALS_ERROR';
      } else {
        errorMessage = error.message;
        errorType = 'GENERAL_ERROR';
      }
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      errorType: errorType,
      message: 'Please check the server logs for more details',
      analytics: {
        responseTime: `${responseTime}ms`,
        error: true
      }
    });
  }
});

// Future Lambda-compatible handler
export const handler = (event: any, context: any) => {
  // This will be used when deploying to AWS Lambda
  console.log('Lambda handler called', { event, context });
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Lambda handler ready' })
  };
};

// Start server (for local development)
if (process.env.NODE_ENV !== 'lambda') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}
