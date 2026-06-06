export type AuditEventType = 
  | "ipo_created" 
  | "ipo_edited" 
  | "ipo_archived" 
  | "ipo_restored" 
  | "settlement_settled" 
  | "settlement_pending"
  | "psr_updated"
  | "user_login"
  | "user_logout"
  | "report_exported";

export type AuditLog = {
  id: string;
  eventType: AuditEventType;
  entityType: "ipo" | "settlement" | "system" | "psr" | "report";
  entityId: string;
  userUid: string;
  userName: string;
  timestamp: string;
  description: string;
  portfolioId?: string; // Optional because system events like login might not be bound to a portfolio
};
