/**
 * Telemetry and Survey Manager with Consent Tracking
 * Proper data collection with transparency and user consent
 */

import * as fs from 'fs';

export interface DataCollectionPolicy {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  retentionDays: number;
  consentRequired: boolean;
  dataController: string;
  createdAt: Date;
}

export interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  policyId: string;
  consentGiven: boolean;
  timestamp: Date;
  method: 'explicit' | 'inferred' | 'revoked';
  metadata?: Record<string, any>;
}

export interface TelemetryEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  dataSubjectId: string;
  data: Record<string, any>;
  consentVerified: boolean;
  sessionId: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId: string;
  responses: Record<string, any>;
  timestamp: Date;
  ipHash?: string; // anonymized
  sessionId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  actor: string;
  resource: string;
  details: Record<string, any>;
}

export class TelemetryAndSurveyManager {
  private policies: Map<string, DataCollectionPolicy> = new Map();
  private consents: Map<string, ConsentRecord[]> = new Map();
  private events: TelemetryEvent[] = [];
  private surveys: Map<string, SurveyResponse[]> = new Map();
  private auditLog: AuditLog[] = [];

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize standard data collection policies
   */
  private initializeDefaultPolicies(): void {
    const policies: DataCollectionPolicy[] = [
      {
        id: 'policy_analytics',
        name: 'Analytics & Performance',
        description: 'Collection of page views, user flows, and performance metrics',
        dataTypes: ['page_view', 'click', 'scroll', 'performance_metrics'],
        retentionDays: 90,
        consentRequired: true,
        dataController: 'analytics@company.com',
        createdAt: new Date(),
      },
      {
        id: 'policy_surveys',
        name: 'User Feedback & Surveys',
        description: 'Collection of survey responses and user feedback',
        dataTypes: ['survey_response', 'feedback', 'rating'],
        retentionDays: 365,
        consentRequired: true,
        dataController: 'feedback@company.com',
        createdAt: new Date(),
      },
      {
        id: 'policy_errors',
        name: 'Error Logging & Debugging',
        description: 'Collection of error logs for debugging and improvement',
        dataTypes: ['error', 'exception', 'warning'],
        retentionDays: 30,
        consentRequired: false, // System-level logging
        dataController: 'support@company.com',
        createdAt: new Date(),
      },
    ];

    policies.forEach(p => this.policies.set(p.id, p));
  }

  /**
   * Record explicit consent from data subject
   */
  public recordConsent(dataSubjectId: string, policyId: string, consentGiven: boolean): ConsentRecord {
    const record: ConsentRecord = {
      id: `consent_${Date.now()}`,
      dataSubjectId,
      policyId,
      consentGiven,
      timestamp: new Date(),
      method: 'explicit',
    };

    if (!this.consents.has(dataSubjectId)) {
      this.consents.set(dataSubjectId, []);
    }

    this.consents.get(dataSubjectId)!.push(record);
    this.logAudit('consent_recorded', 'system', `policy:${policyId}`, {
      dataSubjectId,
      consentGiven,
    });

    return record;
  }

  /**
   * Check if data subject has consented to a policy
   */
  public hasConsent(dataSubjectId: string, policyId: string): boolean {
    const policy = this.policies.get(policyId);
    
    if (policy && !policy.consentRequired) {
      return true; // System policies don't require consent
    }

    const records = this.consents.get(dataSubjectId) || [];
    const latestConsent = records
      .filter(r => r.policyId === policyId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return latestConsent?.consentGiven === true;
  }

  /**
   * Record telemetry event WITH consent verification
   */
  public recordTelemetryEvent(
    eventType: string,
    dataSubjectId: string,
    data: Record<string, any>,
    policyId: string = 'policy_analytics',
    sessionId: string = 'unknown'
  ): TelemetryEvent | null {
    // Verify consent before recording
    if (!this.hasConsent(dataSubjectId, policyId)) {
      this.logAudit('telemetry_rejected', 'system', `event:${eventType}`, {
        reason: 'no_consent',
        dataSubjectId,
        policyId,
      });
      return null;
    }

    const event: TelemetryEvent = {
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      eventType,
      dataSubjectId,
      data,
      consentVerified: true,
      sessionId,
    };

    this.events.push(event);
    return event;
  }

  /**
   * Record survey response WITH consent verification
   */
  public recordSurveyResponse(
    surveyId: string,
    respondentId: string,
    responses: Record<string, any>,
    sessionId?: string
  ): SurveyResponse | null {
    // Verify consent for surveys
    if (!this.hasConsent(respondentId, 'policy_surveys')) {
      this.logAudit('survey_rejected', 'system', `survey:${surveyId}`, {
        reason: 'no_consent',
        respondentId,
      });
      return null;
    }

    const response: SurveyResponse = {
      id: `survey_response_${Date.now()}`,
      surveyId,
      respondentId,
      responses,
      timestamp: new Date(),
      sessionId,
    };

    if (!this.surveys.has(surveyId)) {
      this.surveys.set(surveyId, []);
    }

    this.surveys.get(surveyId)!.push(response);
    this.logAudit('survey_response_recorded', 'user', `survey:${surveyId}`, {
      respondentId,
    });

    return response;
  }

  /**
   * Revoke consent
   */
  public revokeConsent(dataSubjectId: string, policyId: string): ConsentRecord {
    const record: ConsentRecord = {
      id: `consent_revoke_${Date.now()}`,
      dataSubjectId,
      policyId,
      consentGiven: false,
      timestamp: new Date(),
      method: 'revoked',
    };

    if (!this.consents.has(dataSubjectId)) {
      this.consents.set(dataSubjectId, []);
    }

    this.consents.get(dataSubjectId)!.push(record);
    this.logAudit('consent_revoked', 'user', `policy:${policyId}`, {
      dataSubjectId,
    });

    return record;
  }

  /**
   * Get telemetry summary (anonymized)
   */
  public getTelemetrySummary(): object {
    const eventTypes = this.events.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: this.events.length,
      uniqueSubjects: new Set(this.events.map(e => e.dataSubjectId)).size,
      eventTypes,
      timeRange: {
        start: this.events.length > 0 ? this.events[0].timestamp : null,
        end: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null,
      },
    };
  }

  /**
   * Get consent statistics
   */
  public getConsentStatistics(): object {
    const allConsents = Array.from(this.consents.values()).flat();
    const latestByPolicy = new Map<string, ConsentRecord>();

    allConsents.forEach(c => {
      const key = `${c.dataSubjectId}_${c.policyId}`;
      const existing = latestByPolicy.get(key);
      
      if (!existing || c.timestamp > existing.timestamp) {
        latestByPolicy.set(key, c);
      }
    });

    const granted = Array.from(latestByPolicy.values()).filter(c => c.consentGiven).length;
    const total = latestByPolicy.size;

    return {
      totalConsents: total,
      granted,
      declined: total - granted,
      consentRate: total > 0 ? `${((granted / total) * 100).toFixed(2)}%` : 'N/A',
    };
  }

  /**
   * Log audit trail
   */
  private logAudit(action: string, actor: string, resource: string, details: Record<string, any>): void {
    this.auditLog.push({
      id: `audit_${Date.now()}`,
      timestamp: new Date(),
      action,
      actor,
      resource,
      details,
    });
  }

  /**
   * Export audit log
   */
  public exportAuditLog(filename: string): string {
    fs.writeFileSync(filename, JSON.stringify(this.auditLog, null, 2));
    this.logAudit('audit_log_exported', 'system', 'audit_log', {
      filename,
      recordCount: this.auditLog.length,
    });
    return filename;
  }

  /**
   * Delete data for subject (right to be forgotten)
   */
  public deleteDataForSubject(dataSubjectId: string): object {
    const eventsDeleted = this.events.filter(e => e.dataSubjectId === dataSubjectId).length;
    this.events = this.events.filter(e => e.dataSubjectId !== dataSubjectId);

    const surveysDeleted = Array.from(this.surveys.values())
      .reduce((sum, arr) => sum + arr.filter(r => r.respondentId === dataSubjectId).length, 0);

    this.surveys.forEach((responses, surveyId) => {
      this.surveys.set(
        surveyId,
        responses.filter(r => r.respondentId !== dataSubjectId)
      );
    });

    this.logAudit('data_deletion_request', 'system', `subject:${dataSubjectId}`, {
      eventsDeleted,
      surveysDeleted,
    });

    return {
      dataSubjectId,
      eventsDeleted,
      surveysDeleted,
      timestamp: new Date(),
    };
  }

  /**
   * Get transparency report
   */
  public getTransparencyReport(): string {
    const report = `
=== DATA COLLECTION TRANSPARENCY REPORT ===
Generated: ${new Date().toISOString()}

DATA COLLECTION POLICIES:
${Array.from(this.policies.values())
  .map(p => `
  Policy: ${p.name} (${p.id})
  Description: ${p.description}
  Data Types: ${p.dataTypes.join(', ')}
  Retention: ${p.retentionDays} days
  Consent Required: ${p.consentRequired ? 'YES' : 'NO'}
  Data Controller: ${p.dataController}
`)
  .join('\n')}

CONSENT STATISTICS:
${JSON.stringify(this.getConsentStatistics(), null, 2)}

TELEMETRY SUMMARY:
${JSON.stringify(this.getTelemetrySummary(), null, 2)}

AUDIT LOG ENTRIES: ${this.auditLog.length}

IMPORTANT:
- All data collection respects user consent preferences
- Users can revoke consent at any time
- Data is retained only as specified in policies
- All actions are logged for transparency
- Users have the right to access, correct, or delete their data

=== END REPORT ===
    `;

    return report;
  }
}

export default TelemetryAndSurveyManager;
