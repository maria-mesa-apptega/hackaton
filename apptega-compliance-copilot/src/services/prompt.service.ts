/**
 * Prompt Service for generating AI prompts with Markdown templates
 * Implements domain-specific prompt engineering for compliance contexts
 */

import type {
  ComplianceAskRequest,
  TenantContext,
  UserComplianceData,
  ComplianceFramework,
  UserRole,
  Industry
} from '@types/index';
import { logger, MARKDOWN_TEMPLATES, AI_CONSTANTS, COMPLIANCE_CONSTANTS } from '@utils/index';

// Prompt template interface
export interface PromptTemplate {
  readonly system: string;
  readonly context: string;
  readonly instructions: string;
  readonly format: string;
  readonly examples?: string;
  readonly constraints: string;
}

// Context enrichment interface
export interface PromptContext {
  readonly tenant: TenantContext;
  readonly user?: UserComplianceData;
  readonly request: ComplianceAskRequest;
  readonly historySummary?: string;
}

// Prompt Service implementation
export class PromptService {
  private static instance: PromptService;

  private constructor() {
    logger.info('Prompt service initialized');
  }

  public static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }

  // Main method to build compliance prompt
  public buildCompliancePrompt(context: PromptContext): string {
    const template = this.selectTemplate(context);
    const enrichedContext = this.enrichContext(context);

    const prompt = this.assemblePrompt(template, enrichedContext);

    logger.debug('Compliance prompt generated', {
      promptLength: prompt.length,
      framework: context.request.context?.currentProgram,
      userRole: context.request.context?.userRole,
      organizationId: context.request.organizationId,
      questionLength: context.request.question.length
    });

    return prompt;
  }

  // Select appropriate template based on context
  private selectTemplate(context: PromptContext): PromptTemplate {
    const framework = context.request.context?.currentProgram;
    const userRole = context.request.context?.userRole;
    const urgencyLevel = context.request.context?.urgencyLevel;

    // Select template based on framework
    if (framework) {
      switch (framework) {
        case 'NIST_CSF_V1_1':
          return this.getNISTTemplate(userRole, urgencyLevel);
        case 'ISO_27001':
          return this.getISO27001Template(userRole, urgencyLevel);
        case 'SOC2_TYPE_I':
        case 'SOC2_TYPE_II':
          return this.getSOC2Template(userRole, urgencyLevel);
        default:
          return this.getGenericComplianceTemplate(userRole, urgencyLevel);
      }
    }

    return this.getGenericComplianceTemplate(userRole, urgencyLevel);
  }

  // NIST CSF specific template
  private getNISTTemplate(userRole?: UserRole, urgencyLevel?: string): PromptTemplate {
    const roleContext = this.getRoleSpecificContext(userRole);
    const urgencyContext = this.getUrgencyContext(urgencyLevel);

    return {
      system: `You are an expert NIST Cybersecurity Framework compliance assistant integrated with the Apptega platform. You specialize in translating NIST CSF v1.1 requirements into actionable guidance for ${roleContext.title}.`,

      context: `${roleContext.description}

NIST CSF EXPERTISE:
- Deep knowledge of all 5 Functions: Identify, Protect, Detect, Respond, Recover
- 108 Subcategory requirements and implementation guidance
- Industry-specific implementation patterns
- Risk assessment and maturity evaluation methodologies

APPTEGA PLATFORM INTEGRATION:
- Navigation paths for NIST CSF implementation
- Control evidence collection workflows
- Assessment completion strategies
- Remediation tracking capabilities`,

      instructions: `Provide expert guidance that:
1. References specific NIST CSF subcategories (e.g., PR.AC-1, DE.CM-7)
2. Includes current implementation status when available
3. Provides step-by-step technical implementation guidance
4. Maps to specific Apptega platform actions
5. Considers industry-specific requirements
6. Addresses ${urgencyContext}`,

      format: this.getMarkdownFormat(),

      examples: `EXAMPLE NIST RESPONSE STRUCTURE:
# 🛡️ Multi-Factor Authentication (MFA) for NIST CSF v1.1

**Critical control for access management** - MFA directly supports PR.AC-1 (Identity Management) and strengthens your overall cybersecurity posture.

## 📋 NIST CSF Alignment

- **PR.AC-1**: Identity and credentials are issued, managed, verified, revoked, and audited
- **PR.AC-7**: Users, devices, and other assets are authenticated
- **Current Score**: 60% compliant ✅ → Target: 90% compliant

## 🔧 Technical Implementation

1. **Enable MFA for Administrative Accounts**
   - Configure SAML/SSO integration with MFA requirement
   - Deploy hardware tokens for privileged users
   - Implement risk-based authentication policies

2. **User Account MFA Rollout**
   - Phase 1: IT administrators and executives
   - Phase 2: All employees with system access
   - Phase 3: External users and contractors

## 🎯 Actions in Apptega

- [ ] Navigate to **Organization → Security Settings → MFA Configuration**
- [ ] Enable "Require MFA for all users" policy
- [ ] Upload MFA evidence in **Controls → PR.AC-1 → Evidence**
- [ ] Update implementation status to "Implemented"

## ⚠️ Disclaimer

*Consult your IT security team before implementing MFA changes. Test in a staging environment first.*`,

      constraints: this.getConstraints()
    };
  }

  // ISO 27001 specific template
  private getISO27001Template(userRole?: UserRole, urgencyLevel?: string): PromptTemplate {
    const roleContext = this.getRoleSpecificContext(userRole);
    const urgencyContext = this.getUrgencyContext(urgencyLevel);

    return {
      system: `You are an expert ISO 27001:2013 compliance consultant integrated with Apptega. You provide authoritative guidance on Information Security Management System (ISMS) implementation for ${roleContext.title}.`,

      context: `${roleContext.description}

ISO 27001 EXPERTISE:
- Complete understanding of all 14 Annex A control families (A.5-A.18)
- ISMS implementation methodology and certification requirements
- Risk treatment planning and Statement of Applicability (SoA)
- Internal audit and management review processes

CERTIFICATION CONTEXT:
- Gap analysis and remediation planning
- Evidence collection and documentation requirements
- External audit preparation strategies
- Continuous improvement frameworks`,

      instructions: `Deliver expert ISO 27001 guidance that:
1. References specific Annex A controls (e.g., A.9.1.2, A.12.6.1)
2. Addresses ISMS context and risk management
3. Provides audit-ready evidence requirements
4. Maps to Apptega's ISO 27001 modules
5. Considers certification timeline implications
6. Addresses ${urgencyContext}`,

      format: this.getMarkdownFormat(),

      examples: `EXAMPLE ISO 27001 RESPONSE:
# 🔒 Access Control Policy - ISO 27001 A.9.1.1

**Foundational ISMS requirement** - Establishes the framework for all access management controls.

## 📋 Control Requirements

- **A.9.1.1**: Access control policy shall be established, documented and reviewed
- **Related Controls**: A.9.1.2, A.9.2.1-A.9.2.6, A.9.4.1-A.9.4.5
- **Current Maturity**: Level 2 → Target: Level 4

## 📚 Implementation Guide

1. **Policy Development**
   - Define access principles and authorization criteria
   - Establish role-based access control (RBAC) framework
   - Document access request and approval workflows

## 🎯 Apptega Implementation

- [ ] **Navigate to ISO 27001 → Annex A Controls → A.9.1.1**
- [ ] **Upload policy document as primary evidence**
- [ ] **Complete control assessment questionnaire**
- [ ] **Schedule annual policy review reminder**`,

      constraints: this.getConstraints()
    };
  }

  // SOC 2 specific template
  private getSOC2Template(userRole?: UserRole, urgencyLevel?: string): PromptTemplate {
    const roleContext = this.getRoleSpecificContext(userRole);
    const urgencyContext = this.getUrgencyContext(urgencyLevel);

    return {
      system: `You are a SOC 2 readiness expert specializing in Trust Services Criteria implementation through the Apptega platform. You help ${roleContext.title} achieve SOC 2 compliance efficiently.`,

      context: `${roleContext.description}

SOC 2 EXPERTISE:
- Trust Services Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy)
- Type I (design) vs Type II (operating effectiveness) requirements
- Control environment and monitoring procedures
- Vendor management and subservice organization considerations

AUDIT READINESS:
- Evidence collection and retention strategies
- Control testing methodologies
- Management assertion preparation
- Service auditor communication protocols`,

      instructions: `Provide SOC 2-focused guidance that:
1. Maps to specific Trust Services Criteria (CC, A, PI, C, P)
2. Distinguishes between Type I and Type II requirements
3. Addresses control design and operating effectiveness
4. Provides audit evidence specifications
5. References Apptega's SOC 2 workflows
6. Addresses ${urgencyContext}`,

      format: this.getMarkdownFormat(),

      examples: `EXAMPLE SOC 2 RESPONSE:
# 🔐 Logical Access Controls - SOC 2 CC6.1

**Core security criterion** - Demonstrates logical access restrictions and authentication controls.

## 📋 Trust Services Criteria

- **CC6.1**: The entity implements logical access security software, infrastructure, and architectures
- **Type**: Both Type I (design) and Type II (effectiveness) testing required
- **Evidence Period**: Rolling 12-month lookback for Type II

## 🔧 Control Implementation

1. **Authentication Systems**
   - Multi-factor authentication for all users
   - Password complexity and rotation policies
   - Account lockout and monitoring procedures`,

      constraints: this.getConstraints()
    };
  }

  // Generic compliance template
  private getGenericComplianceTemplate(userRole?: UserRole, urgencyLevel?: string): PromptTemplate {
    const roleContext = this.getRoleSpecificContext(userRole);
    const urgencyContext = this.getUrgencyContext(urgencyLevel);

    return {
      system: `You are an expert compliance consultant integrated with the Apptega platform. You provide comprehensive guidance across multiple compliance frameworks for ${roleContext.title}.`,

      context: `${roleContext.description}

MULTI-FRAMEWORK EXPERTISE:
- Cross-framework control mapping and harmonization
- Industry-specific compliance requirements
- Risk-based compliance prioritization
- Integrated GRC (Governance, Risk, Compliance) approaches

APPTEGA PLATFORM MASTERY:
- Multi-framework program management
- Unified control evidence collection
- Cross-framework reporting capabilities
- Automated compliance workflows`,

      instructions: `Deliver comprehensive compliance guidance that:
1. Identifies relevant frameworks and requirements
2. Provides control mapping across standards
3. Prioritizes implementation based on risk and impact
4. Maps to Apptega platform capabilities
5. Considers resource constraints and timelines
6. Addresses ${urgencyContext}`,

      format: this.getMarkdownFormat(),
      constraints: this.getConstraints()
    };
  }

  // Get role-specific context
  private getRoleSpecificContext(userRole?: UserRole): { title: string; description: string } {
    const roleInfo = COMPLIANCE_CONSTANTS.USER_ROLES[userRole || 'USER'];

    switch (userRole) {
      case 'CISO':
        return {
          title: 'Chief Information Security Officers',
          description: 'Focus on strategic security program management, executive reporting, and organizational risk posture. Emphasize business impact, ROI justification, and board-level communication.'
        };
      case 'COMPLIANCE_OFFICER':
        return {
          title: 'Compliance Officers',
          description: 'Concentrate on regulatory requirements, audit readiness, and policy management. Prioritize evidence collection, documentation standards, and regulatory change management.'
        };
      case 'IT_ADMINISTRATOR':
        return {
          title: 'IT Administrators',
          description: 'Provide technical implementation guidance, system configuration details, and operational procedures. Include specific commands, configurations, and technical troubleshooting steps.'
        };
      case 'SECURITY_ANALYST':
        return {
          title: 'Security Analysts',
          description: 'Focus on security controls implementation, threat detection, and incident response procedures. Emphasize technical details, monitoring strategies, and analytical approaches.'
        };
      case 'AUDITOR':
        return {
          title: 'Auditors',
          description: 'Emphasize evidence requirements, testing procedures, and audit trail documentation. Focus on objective verification, sampling methodologies, and compliance validation.'
        };
      case 'EXECUTIVE':
        return {
          title: 'Executive Leadership',
          description: 'Provide high-level strategic guidance, business justification, and organizational impact assessment. Focus on ROI, competitive advantage, and stakeholder communication.'
        };
      default:
        return {
          title: 'Users',
          description: 'Provide clear, actionable guidance appropriate for general organizational users. Balance technical accuracy with accessibility.'
        };
    }
  }

  // Get urgency-specific context
  private getUrgencyContext(urgencyLevel?: string): string {
    switch (urgencyLevel) {
      case 'critical':
        return 'CRITICAL PRIORITY - Focus on immediate actions and emergency procedures';
      case 'high':
        return 'HIGH PRIORITY - Emphasize rapid implementation and quick wins';
      case 'medium':
        return 'MEDIUM PRIORITY - Balance thoroughness with reasonable timelines';
      case 'low':
        return 'LOW PRIORITY - Provide comprehensive long-term planning guidance';
      default:
        return 'STANDARD PRIORITY - Provide balanced implementation guidance';
    }
  }

  // Standard Markdown format template
  private getMarkdownFormat(): string {
    return `RESPONSE FORMAT - Generate in Markdown following this exact structure:

# 🎯 [Specific Topic Title]

**Executive Summary** - One compelling sentence about the business impact.

## 📋 Technical Implementation

1. **Step 1: [Action Title]**
   - Detailed technical guidance
   - Implementation considerations
   - Resource requirements

2. **Step 2: [Action Title]**
   - Continued implementation steps
   - Best practices and pitfalls

## 🎯 Actions in Apptega

- [ ] **Navigate to [Specific Menu Path]**
- [ ] **[Specific action with clear instructions]**
- [ ] **[Additional actions with expected outcomes]**

## 📊 Compliance Status & Impact

| Framework | Current Status | Target | Timeline |
|-----------|----------------|---------|----------|
| [Framework] | [%] | [Target %] | [Timeline] |

## 📚 References & Resources

- **Documentation**: [Relevant standards and guides]
- **Industry Guidance**: [Sector-specific resources]

## ⚠️ Important Considerations

*Include relevant disclaimers about consulting with internal teams, testing procedures, and organization-specific policies.*`;
  }

  // Standard constraints for all prompts
  private getConstraints(): string {
    return `CRITICAL CONSTRAINTS:
- Response must be in Markdown format only
- Include relevant emojis for visual appeal
- Use checkboxes (- [ ]) for actionable items
- Reference specific Apptega navigation paths when possible
- Include current compliance status when available from context
- Provide specific control references (not generic advice)
- Keep technical but accessible language
- Always include disclaimer section
- Maximum response length: 2000 words
- Minimum response length: 300 words
- Include at least 3 actionable items in the Apptega section`;
  }

  // Enrich context with user and organizational data
  private enrichContext(context: PromptContext): string {
    const { tenant, user, request } = context;

    let enrichedContext = `USER CONTEXT:
- Organization: ${tenant.organizationName}
- Organization ID: ${tenant.organizationId}`;

    if (tenant.industry) {
      enrichedContext += `\n- Industry: ${COMPLIANCE_CONSTANTS.INDUSTRIES[tenant.industry] || tenant.industry}`;
    }

    if (request.context?.currentProgram) {
      const framework = COMPLIANCE_CONSTANTS.FRAMEWORKS[request.context.currentProgram];
      if (framework) {
        enrichedContext += `\n- Primary Framework: ${framework.name} (${framework.controlCount} controls)`;
      }
    }

    if (request.context?.userRole) {
      enrichedContext += `\n- User Role: ${COMPLIANCE_CONSTANTS.USER_ROLES[request.context.userRole]}`;
    }

    if (user) {
      enrichedContext += `\n- Assigned Tasks: ${user.assignedTasks.length}`;
      enrichedContext += `\n- Completed Assessments: ${user.completedAssessments.length}`;
      enrichedContext += `\n- Managed Controls: ${user.controls.length}`;
    }

    if (context.historySummary) {
      enrichedContext += `\n\nRECENT CONVERSATION CONTEXT:\n${context.historySummary}`;
    }

    enrichedContext += `\n\nUSER QUESTION: ${request.question}`;

    return enrichedContext;
  }

  // Assemble final prompt from template and context
  private assemblePrompt(template: PromptTemplate, enrichedContext: string): string {
    const prompt = `${template.system}

${template.context}

${enrichedContext}

${template.instructions}

${template.format}

${template.examples || ''}

${template.constraints}`;

    // Validate prompt length
    if (prompt.length > AI_CONSTANTS.PROMPT.MAX_CONTEXT_LENGTH) {
      logger.warn('Prompt length exceeds maximum, truncating context', {
        promptLength: prompt.length,
        maxLength: AI_CONSTANTS.PROMPT.MAX_CONTEXT_LENGTH
      });

      // Truncate the enriched context section if needed
      const truncatedContext = enrichedContext.substring(
        0,
        AI_CONSTANTS.PROMPT.MAX_CONTEXT_LENGTH - (prompt.length - enrichedContext.length) - 100
      );

      return `${template.system}

${template.context}

${truncatedContext}...

${template.instructions}

${template.format}

${template.constraints}`;
    }

    return prompt;
  }

  // Generate conversation history summary
  public generateHistorySummary(conversations: Array<{ question: string; topics: string[] }>): string {
    if (conversations.length === 0) {
      return '';
    }

    const topicMap = new Map<string, number>();
    let summary = 'PREVIOUS QUESTIONS:\n';

    conversations.slice(0, AI_CONSTANTS.PROMPT.MAX_HISTORY_ITEMS).forEach((conv, index) => {
      summary += `${index + 1}. ${conv.question.substring(0, 100)}${conv.question.length > 100 ? '...' : ''}\n`;

      conv.topics.forEach(topic => {
        topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
      });
    });

    // Add top topics
    const topTopics = Array.from(topicMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    if (topTopics.length > 0) {
      summary += `\nFREQUENT TOPICS: ${topTopics.join(', ')}`;
    }

    return summary;
  }
}
