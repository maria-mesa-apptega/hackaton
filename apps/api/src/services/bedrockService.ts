import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { searchComplianceData, getFrameworkInfo, testConnection } from './databaseService.js';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const SYSTEM_PROMPT = `You are the Apptega Compliance Copilot, an expert in cybersecurity compliance frameworks. Your role is to help users understand and implement compliance requirements.

When responding to compliance questions, always structure your response with:

1. **Executive Summary**: A one-line executive summary of the compliance topic
2. **Technical Details**: Bullet points covering the technical aspects
3. **Apptega Actions**: Specific actions that can be taken in the Apptega platform
4. **Disclaimer**: A disclaimer about consulting with compliance experts

Focus on these key compliance frameworks:
- SOC 2 (Service Organization Control 2)
- NIST (National Institute of Standards and Technology)
- ISO 27001 (International Organization for Standardization)
- CIS (Center for Internet Security)

Always provide practical, actionable advice while maintaining a professional tone.`;

export interface ComplianceResponse {
  executiveSummary: string;
  technicalDetails: string[];
  apptegaActions: string[];
  disclaimer: string;
}

export async function askComplianceQuestion(question: string): Promise<ComplianceResponse> {
  try {
    // Debug: Log environment variables
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
    
    // First, try to get data from the database
    console.log('Searching database for compliance data...');
    const dbData = await searchComplianceData(question);
    console.log('Found', dbData.length, 'database records');
    
    // Extract framework names from the question
    const frameworks = extractFrameworks(question);
    let frameworkData = [];
    
    if (frameworks.length > 0) {
      for (const framework of frameworks) {
        const frameworkInfo = await getFrameworkInfo(framework);
        frameworkData = frameworkData.concat(frameworkInfo);
      }
    }
    
    // Combine database data with the prompt
    const dbContext = dbData.length > 0 ? 
      `\n\nDatabase Context:\n${dbData.map(item => 
        `- ${item.title || item.name || 'Record'}: ${item.description || 'No description'}`
      ).join('\n')}` : '';
    
    const frameworkContext = frameworkData.length > 0 ?
      `\n\nFramework Information:\n${frameworkData.map(item => 
        `- ${item.name}: ${item.description || 'No description'}`
      ).join('\n')}` : '';
    
    const prompt = `${SYSTEM_PROMPT}${dbContext}${frameworkContext}\n\nUser Question: ${question}`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0', // Claude 3.5 Sonnet
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;

    // Parse the structured response
    return parseComplianceResponse(content);
  } catch (error) {
    console.error('Error calling Bedrock:', error);
    
    // Try to get database data for fallback response
    console.log('Using fallback response with database data...');
    try {
      const dbData = await searchComplianceData(question);
      const frameworks = extractFrameworks(question);
      let frameworkData = [];
      
      if (frameworks.length > 0) {
        for (const framework of frameworks) {
          const frameworkInfo = await getFrameworkInfo(framework);
          frameworkData = frameworkData.concat(frameworkInfo);
        }
      }
      
      return {
        executiveSummary: `Found ${dbData.length} compliance records and ${frameworkData.length} framework records in the database.`,
        technicalDetails: [
          ...dbData.slice(0, 3).map(item => `${item.title || item.name || 'Record'}: ${item.description || 'No description'}`),
          ...frameworkData.slice(0, 2).map(item => `${item.name}: ${item.description || 'No description'}`)
        ],
        apptegaActions: [
          'Review the compliance data in the Apptega platform',
          'Configure compliance controls based on the database records',
          'Set up monitoring for the identified compliance requirements'
        ],
        disclaimer: 'This response is based on database data. AWS Bedrock access is currently unavailable for enhanced AI responses.'
      };
    } catch (dbError) {
      console.error('Database error in fallback:', dbError);
      return {
        executiveSummary: 'Database connection failed. AWS Bedrock access is currently unavailable.',
        technicalDetails: [
          'The system is configured to use AWS Bedrock with Claude 3.5 Sonnet',
          'Database connection to jsandoval-suite-db failed',
          'AWS credentials are loaded but may not have proper Bedrock permissions'
        ],
        apptegaActions: [
          'Check database connection configuration',
          'Configure AWS IAM permissions for Bedrock access',
          'Enable Bedrock service in the AWS account'
        ],
        disclaimer: 'This is a demo response. Please configure database and AWS Bedrock access for full functionality.'
      };
    }
  }
}

function parseComplianceResponse(content: string): ComplianceResponse {
  // Try to parse the structured response
  const lines = content.split('\n');
  let executiveSummary = '';
  let technicalDetails: string[] = [];
  let apptegaActions: string[] = [];
  let disclaimer = '';

  let currentSection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.includes('Executive Summary') || trimmedLine.includes('Executive one-liner')) {
      currentSection = 'executive';
      continue;
    } else if (trimmedLine.includes('Technical') || trimmedLine.includes('Technical Details')) {
      currentSection = 'technical';
      continue;
    } else if (trimmedLine.includes('Apptega') || trimmedLine.includes('Suggested action')) {
      currentSection = 'apptega';
      continue;
    } else if (trimmedLine.includes('Disclaimer')) {
      currentSection = 'disclaimer';
      continue;
    }

    if (trimmedLine && !trimmedLine.startsWith('#')) {
      switch (currentSection) {
        case 'executive':
          if (!executiveSummary) executiveSummary = trimmedLine;
          break;
        case 'technical':
          if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
            technicalDetails.push(trimmedLine.substring(1).trim());
          } else if (trimmedLine) {
            technicalDetails.push(trimmedLine);
          }
          break;
        case 'apptega':
          if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
            apptegaActions.push(trimmedLine.substring(1).trim());
          } else if (trimmedLine) {
            apptegaActions.push(trimmedLine);
          }
          break;
        case 'disclaimer':
          disclaimer += (disclaimer ? ' ' : '') + trimmedLine;
          break;
      }
    }
  }

  // Fallback if parsing didn't work well
  if (!executiveSummary) {
    executiveSummary = content.split('\n')[0] || 'Compliance guidance provided';
  }
  if (technicalDetails.length === 0) {
    technicalDetails = ['Technical details available in the full response'];
  }
  if (apptegaActions.length === 0) {
    apptegaActions = ['Review the compliance requirements in Apptega platform'];
  }
  if (!disclaimer) {
    disclaimer = 'This information is for educational purposes only. Please consult with compliance experts for specific implementation guidance.';
  }

  return {
    executiveSummary,
    technicalDetails,
    apptegaActions,
    disclaimer
  };
}

function extractFrameworks(question: string): string[] {
  const frameworks = [];
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('soc2') || questionLower.includes('soc 2')) {
    frameworks.push('SOC2');
  }
  if (questionLower.includes('nist')) {
    frameworks.push('NIST');
  }
  if (questionLower.includes('iso') || questionLower.includes('iso 27001')) {
    frameworks.push('ISO 27001');
  }
  if (questionLower.includes('cis')) {
    frameworks.push('CIS');
  }
  if (questionLower.includes('pci') || questionLower.includes('pci dss')) {
    frameworks.push('PCI DSS');
  }
  if (questionLower.includes('hipaa')) {
    frameworks.push('HIPAA');
  }
  if (questionLower.includes('gdpr')) {
    frameworks.push('GDPR');
  }
  
  return frameworks;
}
