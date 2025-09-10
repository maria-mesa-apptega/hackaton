export interface Message {
  answer: string;
  conversationId: string;
  processingTime: string;
  metadata: {
    dataSources: string[];
    complianceFrameworks: string[];
    organizationContext: boolean;
  };
}