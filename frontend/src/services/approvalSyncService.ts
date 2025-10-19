/**
 * Approval Sync Service
 * Handles synchronization between plate recognition approval states and fines management
 */

class ApprovalSyncService {
  private static instance: ApprovalSyncService;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): ApprovalSyncService {
    if (!ApprovalSyncService.instance) {
      ApprovalSyncService.instance = new ApprovalSyncService();
    }
    return ApprovalSyncService.instance;
  }

  /**
   * Subscribe to approval state changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of approval state changes
   */
  private notify(): void {
    this.listeners.forEach(callback => callback());
  }

  /**
   * Handle fine deletion - remove from approval state
   */
  handleFineDeleted(caseInfo: { camera: string; caseId: string }, dateFilter: string): void {
    if (caseInfo) {
      const violationId = `${caseInfo.camera}-${dateFilter}-${caseInfo.caseId}`;
      
      // Remove from localStorage approval states
      const approvedViolations = this.getApprovedViolations();
      const deniedViolations = this.getDeniedViolations();
      
      approvedViolations.delete(violationId);
      deniedViolations.delete(violationId);
      
      this.saveApprovedViolations(approvedViolations);
      this.saveDeniedViolations(deniedViolations);
      
      console.log(`🔄 Removed approval state for deleted fine: ${violationId}`);
      this.notify();
    }
  }

  /**
   * Handle violation denial - remove from fines if exists
   */
  async handleViolationDenied(violation: { camera: string; date: string; case: string }): Promise<void> {
    try {
      const token = localStorage.getItem('token') || 'demo_token_1760447560349_liqy8nlhx';
      
      // Check if there's a fine for this violation and delete it
      const response = await fetch('/api/fines?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.fines) {
          // Find fine matching this violation
          const matchingFine = data.data.fines.find((fine: any) => {
            const notesMatch = fine.notes?.match(/from (\w+) case (\w+)/);
            if (notesMatch) {
              const [, camera, caseId] = notesMatch;
              return camera === violation.camera && caseId === violation.case;
            }
            return false;
          });

          if (matchingFine) {
            // Delete the fine
            const deleteResponse = await fetch(`/api/fines/${matchingFine.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (deleteResponse.ok) {
              console.log(`🗑️ Deleted fine #${matchingFine.id} for denied violation ${violation.camera}-${violation.case}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling violation denial:', error);
    }
  }

  /**
   * Get approved violations from localStorage
   */
  private getApprovedViolations(): Set<string> {
    const saved = localStorage.getItem('approvedViolations');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  }

  /**
   * Get denied violations from localStorage
   */
  private getDeniedViolations(): Set<string> {
    const saved = localStorage.getItem('deniedViolations');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  }

  /**
   * Save approved violations to localStorage
   */
  private saveApprovedViolations(violations: Set<string>): void {
    localStorage.setItem('approvedViolations', JSON.stringify(Array.from(violations)));
  }

  /**
   * Save denied violations to localStorage
   */
  private saveDeniedViolations(violations: Set<string>): void {
    localStorage.setItem('deniedViolations', JSON.stringify(Array.from(violations)));
  }

  /**
   * Clear all approval states
   */
  clearAllStates(): void {
    localStorage.removeItem('approvedViolations');
    localStorage.removeItem('deniedViolations');
    this.notify();
  }

  /**
   * Sync approval states with backend fines
   */
  async syncWithBackend(dateFilter: string): Promise<Set<string>> {
    try {
      const token = localStorage.getItem('token') || 'demo_token_1760447560349_liqy8nlhx';
      
      const response = await fetch('/api/fines?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.fines) {
          const approvedCases = new Set<string>();
          
          data.data.fines.forEach((fine: any) => {
            const notesMatch = fine.notes?.match(/from (\w+) case (\w+)/);
            if (notesMatch) {
              const [, camera, caseId] = notesMatch;
              const violationId = `${camera}-${dateFilter}-${caseId}`;
              approvedCases.add(violationId);
            }
          });
          
          return approvedCases;
        }
      }
    } catch (error) {
      console.error('Error syncing with backend:', error);
    }
    
    return new Set();
  }
}

export default ApprovalSyncService.getInstance();
