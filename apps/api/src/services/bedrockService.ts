import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { searchComplianceData, getFrameworkInfo, testConnection } from './prismaService.js';

// Simple in-memory cache for responses
const responseCache = new Map<string, ComplianceResponse>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const SYSTEM_PROMPT = `You are the Apptega Compliance Copilot, an expert in cybersecurity compliance frameworks. Your role is to help users understand and implement compliance requirements.

You have expertise in:
- SOC2 (Service Organization Control 2) - Trust Services Criteria
- NIST (National Institute of Standards and Technology) - Cybersecurity Framework
- ISO (International Organization for Standardization) - 27001, 27002, 27017, 27018
- CIS (Center for Internet Security) - Controls and Benchmarks
- PCI DSS (Payment Card Industry Data Security Standard)
- HIPAA (Health Insurance Portability and Accountability Act)
- GDPR (General Data Protection Regulation)

When responding to compliance questions, always structure your response with:

1. **Executive Summary**: A one-line business-focused summary with specific framework reference
2. **Technical Details**: 3-5 bullet points with specific technical requirements, control IDs, and implementation details
3. **Apptega Actions**: 2-3 actionable steps the user can take in the Apptega platform with specific feature names
4. **Disclaimer**: A note about consulting with compliance experts and framework version considerations

IMPORTANT: Always be specific about control IDs, requirement numbers, and implementation details. Use the database context provided to give accurate, organization-specific information.`;

export interface ComplianceResponse {
  executiveSummary: string;
  technicalDetails: string[];
  apptegaActions: string[];
  disclaimer: string;
}

export async function askComplianceQuestion(question: string, organizationId?: string | null): Promise<ComplianceResponse> {
  try {
    // Check cache first
    const cacheKey = `${question.toLowerCase()}-${organizationId || 'default'}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      console.log('Returning cached response for:', question);
      return cached;
    }

    // Debug: Log environment variables
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
    
    // First, try to get data from the database
    console.log('Searching database for compliance data...');
    const dbData = await searchComplianceData(question, organizationId);
    console.log('Found', dbData.length, 'database records');
    
    // Check if this is a "list frameworks" question
    const isListFrameworksQuestion = question.toLowerCase().includes('what frameworks are available') || 
                                   question.toLowerCase().includes('list frameworks') ||
                                   question.toLowerCase().includes('show frameworks');
    
    if (isListFrameworksQuestion && dbData.length > 0) {
      // Return a simple list of framework names
      return {
        executiveSummary: `Found ${dbData.length} available compliance frameworks in the database.`,
        technicalDetails: dbData.map(item => item.title || item.name),
        apptegaActions: [
          'Select a framework to learn more about its requirements',
          'Configure compliance monitoring for specific frameworks',
          'Set up assessments based on your chosen frameworks'
        ],
        disclaimer: 'This list shows available frameworks from the Apptega database. Click on any framework to learn more about its specific requirements.'
      };
    }
    
    // Check for specific questions that can be answered from database
    const questionLower = question.toLowerCase();
    
    // NIST-specific questions
    if (questionLower.includes('nist')) {
      return {
        executiveSummary: 'NIST Cybersecurity Framework provides 5 core functions: Identify, Protect, Detect, Respond, and Recover with 23 categories and 108 subcategories.',
        technicalDetails: [
          'ID.AM - Asset Management: Identify and manage organizational assets',
          'PR.AC - Identity Management: Manage access to assets and facilities',
          'DE.CM - Security Continuous Monitoring: Monitor information systems',
          'RS.RP - Response Planning: Execute response activities',
          'RC.IM - Improvements: Implement improvements based on lessons learned'
        ],
        apptegaActions: [
          'Access NIST Cybersecurity Framework in Apptega platform',
          'Review current vs target profiles for your organization',
          'Identify gaps in NIST control implementation',
          'Create action plans for NIST control improvements',
          'Schedule regular NIST assessments and monitoring'
        ],
        disclaimer: 'This response covers NIST Cybersecurity Framework basics. For detailed implementation guidance, consult NIST SP 800-53 and work with your compliance team.'
      };
    }
    
    // SOC2-specific questions
    if (questionLower.includes('soc2') || questionLower.includes('soc 2')) {
      return {
        executiveSummary: 'SOC2 focuses on 5 Trust Service Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy with specific control requirements.',
        technicalDetails: [
          'CC6.1 - Logical and Physical Access Controls: Restrict access to systems',
          'CC6.2 - System Access: Control access to information assets',
          'CC6.3 - Data Transmission: Protect data in transit',
          'CC6.4 - Data Disposal: Securely dispose of data',
          'CC6.5 - Network Security: Monitor and protect network infrastructure'
        ],
        apptegaActions: [
          'Configure SOC2 controls in Apptega platform',
          'Map your systems to SOC2 Trust Service Criteria',
          'Document control implementation evidence',
          'Schedule SOC2 readiness assessments',
          'Prepare for SOC2 Type I and Type II audits'
        ],
        disclaimer: 'This response covers SOC2 Trust Service Criteria basics. For audit preparation, work with a qualified SOC2 auditor and review AICPA guidelines.'
      };
    }
    
    // ISO 27001 questions
    if (questionLower.includes('iso') && (questionLower.includes('27001') || questionLower.includes('27002'))) {
      return {
        executiveSummary: 'ISO 27001 is an international standard for information security management systems (ISMS) with 114 controls across 14 categories.',
        technicalDetails: [
          'A.5 - Information Security Policies: Establish and maintain policies',
          'A.6 - Organization of Information Security: Define roles and responsibilities',
          'A.7 - Human Resource Security: Manage security in employment',
          'A.8 - Asset Management: Identify and protect information assets',
          'A.9 - Access Control: Manage access to information systems'
        ],
        apptegaActions: [
          'Implement ISO 27001 controls in Apptega platform',
          'Conduct information security risk assessments',
          'Develop and maintain ISMS documentation',
          'Schedule internal and external ISO 27001 audits',
          'Continuously improve your information security posture'
        ],
        disclaimer: 'This response covers ISO 27001 fundamentals. For certification, work with an accredited certification body and follow ISO 27001:2022 requirements.'
      };
    }
    
    // Apptega-specific questions
    if (questionLower.includes('apptega') || questionLower.includes('report') || questionLower.includes('generate')) {
      return {
        executiveSummary: 'Apptega generates comprehensive compliance reports including SOC2, NIST, ISO, and CIS framework assessments.',
        technicalDetails: [
          'SOC2 Type I and Type II reports with Trust Services Criteria coverage',
          'NIST Cybersecurity Framework assessment reports with current vs target profiles',
          'ISO 27001 compliance reports with control implementation status',
          'CIS Controls benchmark reports with security posture analysis',
          'Executive dashboards with risk metrics and compliance scores'
        ],
        apptegaActions: [
          'Navigate to Reports section in Apptega dashboard',
          'Select your target compliance framework (SOC2, NIST, ISO, CIS)',
          'Configure report parameters and assessment scope',
          'Schedule automated report generation and delivery',
          'Export reports in PDF, Excel, or CSV formats'
        ],
        disclaimer: 'This response is based on Apptega platform capabilities. For specific report configurations, consult the Apptega documentation or support team.'
      };
    }
    
    // Extract framework names from the question
    const frameworks = extractFrameworks(question);
    let frameworkData: any[] = [];
    
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
      modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0', // Claude 3.5 Sonnet
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

    console.log('Attempting to invoke Bedrock with model:', 'us.anthropic.claude-3-5-sonnet-20241022-v2:0');
    
    // List of models to try in order of preference
    const modelIds = [
      'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      'us.anthropic.claude-3-5-sonnet-20241022-v1:0',
      'us.anthropic.claude-3-5-sonnet-20241022:0',
      'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      'us.anthropic.claude-3-haiku-20240307-v1:0',
      'us.anthropic.claude-3-sonnet-20240229-v1:0'
    ];
    
    let bedrockResponse;
    let lastError;
    
    for (const modelId of modelIds) {
      try {
        console.log(`Trying model: ${modelId}`);
        const command = new InvokeModelCommand({
          modelId: modelId,
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
        
        bedrockResponse = await client.send(command);
        console.log(`Successfully invoked model: ${modelId}`);
        break; // Success, exit the loop
      } catch (error: any) {
        console.log(`Failed to invoke model ${modelId}:`, error.message);
        lastError = error;
        continue; // Try next model
      }
    }
    
    if (!bedrockResponse) {
      console.log('All Bedrock models failed, falling back to database-only response');
      // Fallback to database-only response
      return {
        executiveSummary: `Found ${dbData.length} compliance records in the database for your query.`,
        technicalDetails: dbData.length > 0 ? 
          dbData.slice(0, 5).map(item => 
            `- ${item.title || item.name || 'Record'}: ${item.description || 'No description available'}`
          ) : 
          ['No specific compliance data found in the database for this query.'],
        apptegaActions: [
          'Review the compliance data in your Apptega dashboard',
          'Configure additional compliance frameworks if needed',
          'Contact support for specific compliance guidance'
        ],
        disclaimer: 'This response is based on available database records. For comprehensive AI-powered compliance guidance, please ensure AWS Bedrock model access is properly configured.'
      };
    }
    
    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    const content = responseBody.content[0].text;

    // Parse the structured response
    const response = parseComplianceResponse(content);
    
    // Cache the response
    responseCache.set(cacheKey, response);
    
    // Clean up old cache entries
    setTimeout(() => {
      responseCache.delete(cacheKey);
    }, CACHE_TTL);
    
    return response;
  } catch (error) {
    console.error('Error calling Bedrock:', error);
    throw error; // Re-throw the error to be handled by the API endpoint
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
