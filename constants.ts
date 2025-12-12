import { Transaction, AgentRole, AuditLog } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TXN-8832-ALPHA',
    vendorName: 'Acme Cloud Services',
    invoiceId: 'INV-2024-001',
    amount: 12500.00,
    currency: 'USD',
    date: '2024-05-10',
    status: 'FAILED',
    failureReason: 'FATAL: Routing Number Mismatch',
    vendorEmail: 'billing@acmecloud.com'
  },
  {
    id: 'TXN-9941-BETA',
    vendorName: 'Global Logistics Partners',
    invoiceId: 'INV-GLP-992',
    amount: 4320.50,
    currency: 'USD',
    date: '2024-05-11',
    status: 'CLEARED',
    vendorEmail: 'accounts@globallogistics.com'
  },
  {
    id: 'TXN-7721-GAMMA',
    vendorName: 'OfficeSupplies Co.',
    invoiceId: 'INV-OS-7721',
    amount: 850.00,
    currency: 'USD',
    date: '2024-05-12',
    status: 'FAILED',
    failureReason: 'Insufficient Funds in Sub-Account',
    vendorEmail: 'finance@officesupplies.co'
  },
  {
    id: 'TXN-3321-DELTA',
    vendorName: 'Zenith Marketing',
    invoiceId: 'INV-ZM-331',
    amount: 15000.00,
    currency: 'USD',
    date: '2024-05-12',
    status: 'RECTIFYING',
    failureReason: 'Duplicate Invoice ID Detected',
    vendorEmail: 'ar@zenithmkt.com'
  },
  {
    id: 'TXN-1102-EPSILON',
    vendorName: 'TechFlow Systems',
    invoiceId: 'INV-TF-1102',
    amount: 2999.99,
    currency: 'USD',
    date: '2024-05-13',
    status: 'RECTIFIED',
    failureReason: 'Incorrect Currency Code',
    vendorEmail: 'payments@techflow.io'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-001',
    transactionId: 'TXN-8832-ALPHA',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    agent: AgentRole.AUDITOR,
    action: 'Transaction Failed',
    details: 'Transaction flagged by payment gateway. Error: Routing Number Mismatch.'
  },
  {
    id: 'LOG-002',
    transactionId: 'TXN-3321-DELTA',
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    agent: AgentRole.AUDITOR,
    action: 'Duplicate Flag',
    details: 'System detected potential duplicate invoice INV-ZM-331.'
  },
  {
    id: 'LOG-003',
    transactionId: 'TXN-3321-DELTA',
    timestamp: new Date(Date.now() - 40000000).toISOString(),
    agent: AgentRole.LIAISON,
    action: 'Vendor Contacted',
    details: 'Email sent to ar@zenithmkt.com requesting clarification on invoice duplication.'
  }
];
