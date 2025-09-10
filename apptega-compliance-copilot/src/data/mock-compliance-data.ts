/**
 * Mock Compliance Data for Testing and Demonstration
 * Provides realistic test data for various compliance frameworks
 */

import type {
  TenantContext,
  UserComplianceData,
  ComplianceTask,
  Assessment,
  Control,
  ComplianceFramework,
  UserRole,
  Industry
} from '@types/index';

// Mock Organizations
export const MOCK_ORGANIZATIONS: TenantContext[] = [
  {
    organizationId: 1,
    organizationName: 'TechCorp Solutions',
    industry: 'technology',
    currentProgram: 'NIST_CSF_V1_1',
    partnerName: 'Apptega Enterprise',
    partnerType: 'enterprise',
    complianceLevel: 75,
    activeFrameworks: ['NIST_CSF_V1_1', 'ISO_27001', 'SOC2_TYPE_II']
  },
  {
    organizationId: 2,
    organizationName: 'HealthFirst Medical',
    industry: 'healthcare',
    currentProgram: 'HIPAA',
    partnerName: 'Apptega Healthcare',
    partnerType: 'specialized',
    complianceLevel: 85,
    activeFrameworks: ['HIPAA', 'NIST_CSF_V1_1', 'ISO_27001']
  },
  {
    organizationId: 3,
    organizationName: 'SecureBank Financial',
    industry: 'financial_services',
    currentProgram: 'SOC2_TYPE_II',
    partnerName: 'Apptega Financial',
    partnerType: 'enterprise',
    complianceLevel: 90,
    activeFrameworks: ['SOC2_TYPE_II', 'PCI_DSS', 'NIST_CSF_V1_1']
  },
  {
    organizationId: 4,
    organizationName: 'EduTech University',
    industry: 'education',
    currentProgram: 'NIST_CSF_V1_1',
    partnerName: 'Apptega Education',
    partnerType: 'academic',
    complianceLevel: 60,
    activeFrameworks: ['NIST_CSF_V1_1', 'ISO_27001']
  }
];

// Mock Controls for different frameworks
export const MOCK_CONTROLS: Record<ComplianceFramework, Control[]> = {
  NIST_CSF_V1_1: [
    {
      id: 'nist-id-am-1',
      controlNumber: 'ID.AM-1',
      controlTitle: 'Physical devices and systems within the organization are inventoried',
      status: 'implemented',
      frameworkId: 'NIST_CSF_V1_1',
      implementationPercentage: 95,
      evidenceCount: 8,
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    {
      id: 'nist-pr-ac-1',
      controlNumber: 'PR.AC-1',
      controlTitle: 'Identities and credentials are issued, managed, verified, revoked, and audited',
      status: 'in_progress',
      frameworkId: 'NIST_CSF_V1_1',
      implementationPercentage: 75,
      evidenceCount: 5,
      lastUpdated: '2024-01-10T14:20:00Z'
    },
    {
      id: 'nist-pr-ac-7',
      controlNumber: 'PR.AC-7',
      controlTitle: 'Users, devices, and other assets are authenticated',
      status: 'in_progress',
      frameworkId: 'NIST_CSF_V1_1',
      implementationPercentage: 60,
      evidenceCount: 3,
      lastUpdated: '2024-01-08T09:15:00Z'
    },
    {
      id: 'nist-de-cm-7',
      controlNumber: 'DE.CM-7',
      controlTitle: 'Monitoring for unauthorized personnel, connections, devices, and software is performed',
      status: 'not_implemented',
      frameworkId: 'NIST_CSF_V1_1',
      implementationPercentage: 20,
      evidenceCount: 1,
      lastUpdated: '2024-01-05T16:45:00Z'
    }
  ],
  ISO_27001: [
    {
      id: 'iso-a9-1-1',
      controlNumber: 'A.9.1.1',
      controlTitle: 'Access control policy',
      status: 'implemented',
      frameworkId: 'ISO_27001',
      implementationPercentage: 90,
      evidenceCount: 12,
      lastUpdated: '2024-01-12T11:00:00Z'
    },
    {
      id: 'iso-a9-1-2',
      controlNumber: 'A.9.1.2',
      controlTitle: 'Access to networks and network services',
      status: 'in_progress',
      frameworkId: 'ISO_27001',
      implementationPercentage: 70,
      evidenceCount: 6,
      lastUpdated: '2024-01-09T13:30:00Z'
    },
    {
      id: 'iso-a12-6-1',
      controlNumber: 'A.12.6.1',
      controlTitle: 'Management of technical vulnerabilities',
      status: 'in_progress',
      frameworkId: 'ISO_27001',
      implementationPercentage: 55,
      evidenceCount: 4,
      lastUpdated: '2024-01-07T15:20:00Z'
    }
  ],
  SOC2_TYPE_I: [
    {
      id: 'soc2-cc6-1',
      controlNumber: 'CC6.1',
      controlTitle: 'Logical access security software, infrastructure, and architectures',
      status: 'implemented',
      frameworkId: 'SOC2_TYPE_I',
      implementationPercentage: 85,
      evidenceCount: 10,
      lastUpdated: '2024-01-14T12:15:00Z'
    }
  ],
  SOC2_TYPE_II: [
    {
      id: 'soc2-cc6-1-t2',
      controlNumber: 'CC6.1',
      controlTitle: 'Logical access security software, infrastructure, and architectures (Operating Effectiveness)',
      status: 'in_progress',
      frameworkId: 'SOC2_TYPE_II',
      implementationPercentage: 80,
      evidenceCount: 15,
      lastUpdated: '2024-01-13T14:45:00Z'
    }
  ],
  CIS_CONTROLS: [
    {
      id: 'cis-1-1',
      controlNumber: 'CIS-1.1',
      controlTitle: 'Establish and Maintain Detailed Asset Inventory',
      status: 'implemented',
      frameworkId: 'CIS_CONTROLS',
      implementationPercentage: 92,
      evidenceCount: 7,
      lastUpdated: '2024-01-11T10:00:00Z'
    }
  ],
  CCPA: [
    {
      id: 'ccpa-1798-100-a',
      controlNumber: '1798.100(a)',
      controlTitle: 'Right to Know About Personal Information Collected',
      status: 'implemented',
      frameworkId: 'CCPA',
      implementationPercentage: 88,
      evidenceCount: 9,
      lastUpdated: '2024-01-10T16:30:00Z'
    }
  ],
  GDPR: [
    {
      id: 'gdpr-art-32',
      controlNumber: 'Article 32',
      controlTitle: 'Security of processing',
      status: 'in_progress',
      frameworkId: 'GDPR',
      implementationPercentage: 65,
      evidenceCount: 8,
      lastUpdated: '2024-01-09T11:45:00Z'
    }
  ],
  HIPAA: [
    {
      id: 'hipaa-164-312-a-1',
      controlNumber: '164.312(a)(1)',
      controlTitle: 'Access control - Assigned security responsibility',
      status: 'implemented',
      frameworkId: 'HIPAA',
      implementationPercentage: 95,
      evidenceCount: 11,
      lastUpdated: '2024-01-08T13:20:00Z'
    }
  ],
  PCI_DSS: [
    {
      id: 'pci-req-1',
      controlNumber: 'Requirement 1',
      controlTitle: 'Install and maintain a firewall configuration to protect cardholder data',
      status: 'implemented',
      frameworkId: 'PCI_DSS',
      implementationPercentage: 90,
      evidenceCount: 13,
      lastUpdated: '2024-01-12T09:30:00Z'
    }
  ]
};

// Mock Assessments
export const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: 'assess-nist-q1-2024',
    name: 'NIST CSF Q1 2024 Assessment',
    frameworkId: 'NIST_CSF_V1_1',
    completionDate: '2024-01-15T00:00:00Z',
    score: 78,
    status: 'completed'
  },
  {
    id: 'assess-iso-annual-2024',
    name: 'ISO 27001 Annual Assessment 2024',
    frameworkId: 'ISO_27001',
    completionDate: '2024-01-10T00:00:00Z',
    score: 82,
    status: 'completed'
  },
  {
    id: 'assess-soc2-prep-2024',
    name: 'SOC 2 Type II Readiness Assessment',
    frameworkId: 'SOC2_TYPE_II',
    completionDate: '',
    score: 0,
    status: 'in_progress'
  }
];

// Mock Tasks
export const MOCK_TASKS: ComplianceTask[] = [
  {
    id: 'task-mfa-implementation',
    title: 'Implement Multi-Factor Authentication for Administrative Accounts',
    status: 'in_progress',
    dueDate: '2024-02-01T00:00:00Z',
    controlId: 'nist-pr-ac-7',
    frameworkId: 'NIST_CSF_V1_1'
  },
  {
    id: 'task-vulnerability-scan',
    title: 'Quarterly Vulnerability Scanning and Remediation',
    status: 'pending',
    dueDate: '2024-01-30T00:00:00Z',
    controlId: 'iso-a12-6-1',
    frameworkId: 'ISO_27001'
  },
  {
    id: 'task-access-review',
    title: 'Quarterly Access Rights Review',
    status: 'overdue',
    dueDate: '2024-01-15T00:00:00Z',
    controlId: 'iso-a9-1-2',
    frameworkId: 'ISO_27001'
  },
  {
    id: 'task-monitoring-setup',
    title: 'Deploy Network Monitoring Solution',
    status: 'pending',
    dueDate: '2024-02-15T00:00:00Z',
    controlId: 'nist-de-cm-7',
    frameworkId: 'NIST_CSF_V1_1'
  },
  {
    id: 'task-soc2-evidence',
    title: 'Collect SOC 2 Type II Evidence Documentation',
    status: 'in_progress',
    dueDate: '2024-02-28T00:00:00Z',
    controlId: 'soc2-cc6-1-t2',
    frameworkId: 'SOC2_TYPE_II'
  }
];

// Mock User Compliance Data
export const MOCK_USER_COMPLIANCE_DATA: Record<string, UserComplianceData> = {
  'demo-user-1': {
    userId: 'demo-user-1',
    organizationId: 1,
    assignedTasks: [
      MOCK_TASKS[0], // MFA implementation
      MOCK_TASKS[3]  // Monitoring setup
    ],
    completedAssessments: [
      MOCK_ASSESSMENTS[0] // NIST CSF Q1 2024
    ],
    controls: [
      MOCK_CONTROLS.NIST_CSF_V1_1[0], // ID.AM-1
      MOCK_CONTROLS.NIST_CSF_V1_1[1], // PR.AC-1
      MOCK_CONTROLS.NIST_CSF_V1_1[2]  // PR.AC-7
    ]
  },
  'demo-user-2': {
    userId: 'demo-user-2',
    organizationId: 2,
    assignedTasks: [
      MOCK_TASKS[1], // Vulnerability scan
      MOCK_TASKS[2]  // Access review
    ],
    completedAssessments: [
      MOCK_ASSESSMENTS[1] // ISO 27001 Annual
    ],
    controls: [
      MOCK_CONTROLS.ISO_27001[0], // A.9.1.1
      MOCK_CONTROLS.ISO_27001[1], // A.9.1.2
      MOCK_CONTROLS.HIPAA[0]      // HIPAA 164.312(a)(1)
    ]
  },
  'demo-user-3': {
    userId: 'demo-user-3',
    organizationId: 3,
    assignedTasks: [
      MOCK_TASKS[4] // SOC 2 evidence
    ],
    completedAssessments: [],
    controls: [
      MOCK_CONTROLS.SOC2_TYPE_II[0], // CC6.1
      MOCK_CONTROLS.PCI_DSS[0]       // Requirement 1
    ]
  }
};

// Mock compliance status by organization
export const MOCK_COMPLIANCE_STATUS = {
  1: {
    organizationId: 1,
    framework: 'NIST_CSF_V1_1',
    overallScore: 75,
    controlsImplemented: 45,
    totalControls: 108,
    lastAssessmentDate: '2024-01-15T00:00:00Z',
    nextAuditDate: '2024-04-15T00:00:00Z',
    criticalFindings: 3,
    riskLevel: 'medium' as const
  },
  2: {
    organizationId: 2,
    framework: 'HIPAA',
    overallScore: 85,
    controlsImplemented: 32,
    totalControls: 45,
    lastAssessmentDate: '2024-01-10T00:00:00Z',
    nextAuditDate: '2024-07-10T00:00:00Z',
    criticalFindings: 1,
    riskLevel: 'low' as const
  },
  3: {
    organizationId: 3,
    framework: 'SOC2_TYPE_II',
    overallScore: 90,
    controlsImplemented: 58,
    totalControls: 64,
    lastAssessmentDate: '2024-01-05T00:00:00Z',
    nextAuditDate: '2024-03-05T00:00:00Z',
    criticalFindings: 0,
    riskLevel: 'low' as const
  }
};

// Sample questions for testing
export const SAMPLE_COMPLIANCE_QUESTIONS = {
  NIST_CSF_V1_1: [
    "¿Cómo implementar MFA para cumplir con PR.AC-7 en NIST CSF?",
    "Dame un resumen ejecutivo de NIST CSF v1.1 en 3 bullets",
    "¿Qué controles de NIST CSF debo priorizar para mejorar mi postura de seguridad?",
    "¿Cómo mapear los controles de NIST CSF con mi infraestructura actual?",
    "Explícame la función 'Detect' del NIST CSF y cómo implementarla"
  ],
  ISO_27001: [
    "¿Qué documentación necesito para el control A.9.1.1 de ISO 27001?",
    "¿Cómo preparar mi organización para una auditoría ISO 27001?",
    "Diferencias entre ISO 27001:2013 y ISO 27001:2022",
    "¿Qué evidencias debo recopilar para el Anexo A de ISO 27001?",
    "¿Cómo implementar un SGSI según ISO 27001?"
  ],
  SOC2_TYPE_II: [
    "¿Cuál es la diferencia entre SOC 2 Type I y Type II?",
    "¿Qué evidencias necesito para CC6.1 en SOC 2 Type II?",
    "¿Cuánto tiempo toma prepararse para un SOC 2 Type II?",
    "¿Qué controles son obligatorios vs opcionales en SOC 2?",
    "¿Cómo demostrar efectividad operacional en SOC 2 Type II?"
  ],
  GENERAL: [
    "¿Qué framework de compliance debería elegir para mi startup fintech?",
    "¿Cómo justificar el ROI de un programa de compliance al CFO?",
    "¿Cuáles son las mejores prácticas para gestionar múltiples frameworks?",
    "¿Cómo automatizar la recopilación de evidencias de compliance?",
    "¿Qué métricas debo reportar a la junta directiva sobre compliance?"
  ]
};

// Expected AI responses for testing (templates)
export const SAMPLE_AI_RESPONSES = {
  MFA_NIST: `# 🔐 Multi-Factor Authentication (MFA) para NIST CSF v1.1

**MFA es crítico para NIST** - es uno de los controles fundamentales para proteger el acceso privilegiado y cumplir con los estándares de ciberseguridad.

## 📋 Pasos Técnicos

1. **Implementar MFA en cuentas administrativas**
   - Configure MFA para todos los usuarios con privilegios elevados
   - Use authenticators como Microsoft Authenticator, Google Authenticator, o hardware tokens

2. **Configurar políticas de acceso condicional**
   - Establezca reglas basadas en ubicación, dispositivo y comportamiento
   - Implemente zero-trust access para aplicaciones críticas

## 🎯 Acciones en Apptega

- [ ] **Navegar a Organización → Configuración de Seguridad**
- [ ] **Activar "Requerir MFA para todos los usuarios"**
- [ ] **Configurar periodo de gracia (recomendado: 30 días)**
- [ ] **Notificar usuarios sobre el cambio**

## 📊 Referencias de Compliance

- **NIST CSF v1.1**: \`PR.AC-1\` (Identity Management), \`PR.AC-7\` (Access Control)
- **Estado actual**: 60% completo ✅
- **Mejora esperada**: +25% compliance score

## ⚠️ Disclaimer

*Esta información es general. Consulte con su equipo de IT y revise las políticas específicas de su organización antes de implementar cambios de seguridad.*`,

  SOC2_EXECUTIVE: `# 📊 SOC 2 Type II - Resumen Ejecutivo

**SOC 2 Type II demuestra que sus controles no solo están diseñados correctamente, sino que operan efectivamente durante un período de tiempo.**

## 🎯 Valor de Negocio

- **Confianza del cliente**: Demuestra compromiso con la seguridad de datos
- **Ventaja competitiva**: Diferenciador en procesos de ventas B2B
- **Reducción de riesgos**: Identifica y mitiga vulnerabilidades operacionales

## 📈 Implementación en Apptega

- [ ] **Usar template SOC 2 Type II predefinido**
- [ ] **Configurar recopilación automática de evidencias**
- [ ] **Establecer cronograma de auditoría (12 meses)**

## ⏰ Timeline Típico

- **Preparación**: 6-12 meses
- **Período de observación**: 12 meses mínimo
- **Auditoría**: 4-6 semanas

## ⚠️ Consideraciones

*SOC 2 Type II requiere evidencia continua de efectividad operacional. Consulte con auditores certificados para planificación específica.*`
};

// Helper functions for mock data
export function getMockOrganizationById(id: number): TenantContext | null {
  return MOCK_ORGANIZATIONS.find(org => org.organizationId === id) || null;
}

export function getMockUserComplianceData(userId: string, organizationId: number): UserComplianceData | null {
  const userData = MOCK_USER_COMPLIANCE_DATA[userId];
  if (userData && userData.organizationId === organizationId) {
    return userData;
  }
  return null;
}

export function getMockControlsByFramework(framework: ComplianceFramework): Control[] {
  return MOCK_CONTROLS[framework] || [];
}

export function getRandomSampleQuestion(framework?: ComplianceFramework): string {
  const questions = framework
    ? SAMPLE_COMPLIANCE_QUESTIONS[framework] || SAMPLE_COMPLIANCE_QUESTIONS.GENERAL
    : SAMPLE_COMPLIANCE_QUESTIONS.GENERAL;

  return questions[Math.floor(Math.random() * questions.length)];
}

export function getMockComplianceStatus(organizationId: number) {
  return MOCK_COMPLIANCE_STATUS[organizationId as keyof typeof MOCK_COMPLIANCE_STATUS] || null;
}
