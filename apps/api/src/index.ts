import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { askComplianceQuestion } from './services/bedrockService.js';
import { testConnection, queryDatabase } from './services/databaseService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

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
    // Get all tables
    const tables = await queryDatabase(`
      SELECT TABLE_NAME, TABLE_COMMENT 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'apptega']);
    
    // Get framework table structure
    let frameworkColumns = [];
    let frameworkData = [];
    try {
      frameworkColumns = await queryDatabase(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'framework'
        ORDER BY ORDINAL_POSITION
      `, [process.env.DB_NAME || 'apptega']);
      
      frameworkData = await queryDatabase(`SELECT * FROM framework LIMIT 5`);
    } catch (error) {
      console.log('Framework table not found or empty:', error.message);
    }
    
    res.json({
      success: true,
      database: process.env.DB_NAME || 'apptega',
      tables: tables.length,
      tableNames: tables.map(t => t.TABLE_NAME),
      frameworkColumns: frameworkColumns,
      frameworkData: frameworkData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Compliance Q&A endpoint
app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ 
        error: 'Question is required',
        message: 'Please provide a question in the request body'
      });
    }

    console.log('Received compliance question:', question);
    
    const response = await askComplianceQuestion(question);
    
    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing compliance question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process compliance question',
      message: error instanceof Error ? error.message : 'Unknown error'
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
