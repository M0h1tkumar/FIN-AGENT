export type Status = 'CLEARED' | 'FAILED' | 'RECTIFYING' | 'RECTIFIED';

export enum AgentRole {
  AUDITOR = 'AUDITOR',
  LIAISON = 'LIAISON',
  CONTROLLER = 'CONTROLLER',
  SYSTEM = 'AUTO_AGENT'
}

export interface Transaction {
  id: string;
  vendorName: string;
  invoiceId: string;
  amount: number;
  currency: string;
  date: string;
  status: Status;
  failureReason?: string; // e.g. "FATAL: Routing Number Mismatch"
  vendorEmail: string;
}

export interface AuditLog {
  id: string;
  transactionId: string;
  timestamp: string;
  agent: AgentRole;
  action: string;
  details: string;
  metadata?: Record<string, any>; // For storing AI analysis or draft content
}

export interface AgentResponse {
  content: string;
  suggestedActions?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AutoPilotPlan {
  steps: {
    action: 'ANALYZE' | 'EMAIL_VENDOR' | 'RECTIFY';
    description: string;
  }[];
  reasoning: string;
}

export interface PredictionResult {
  score: number; // 0-100
  label: 'High' | 'Medium' | 'Low';
  rationale: string;
}