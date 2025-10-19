/**
 * Approval Sync Service
 * Handles bidirectional synchronization between plate recognition approval states and fines management
 */

class ApprovalSyncService {
  private static instance: ApprovalSyncService;
  private listeners: Set<() => void> = new Set();
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  private constructor() {
    // Initialize event listener maps
    this.eventListeners.set('fineDeleted', new Set());
    this.eventListeners.set('violationApproved', new Set());
    this.eventListeners.set('violationDenied', new Set());
    this.eventListeners.set('stateChanged', new Set());
  }

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
   * Subscribe to specific events
   */
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit specific events
   */
  private emit(event: string, data: any): void {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Notify all listeners of approval state changes
   */
  private notify(): void {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in approval sync listener:', error);
      }
    });
    this.emit('stateChanged', {});
  }

  /**
   * Handle fine deletion - remove from approval state and notify all components
   */
  handleFineDeleted(caseInfo: { camera: string; caseId: string }, dateFilter?: string): void {
    if (caseInfo) {
      // Try multiple date formats to ensure we catch the violation
      const possibleDates = [
        dateFilter,
        new Date().toISOString().split('T')[0], // Today
        new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], // 2 days ago
      ].filter(Boolean);

      const approvedViolations = this.getApprovedViolations();
      const deniedViolations = this.getDeniedViolations();
      let removedCount = 0;

      // Try to remove with different date formats
      possibleDates.forEach(date => {
        const violationId = `${caseInfo.camera}-${date}-${caseInfo.caseId}`;
        if (approvedViolations.has(violationId) || deniedViolations.has(violationId)) {
          approvedViolations.delete(violationId);
          deniedViolations.delete(violationId);
          removedCount++;
          console.log(`🔄 Removed approval state for deleted fine: ${violationId}`);
        }
      });

      if (removedCount > 0) {
        this.saveApprovedViolations(approvedViolations);
        this.saveDeniedViolations(deniedViolations);
        
        // Emit specific event for fine deletion
        this.emit('fineDeleted', {
          caseInfo,
          dateFilter,
          removedCount
        });
        
        this.notify();
      } else {
        console.log(`⚠️ No approval state found for case ${caseInfo.camera}-${caseInfo.caseId}`);
      }
    }
  }

  /**
   * Handle violation approval - add to approval state
   */
  handleViolationApproved(violation: { camera: string; date: string; case: string }): void {
    const violationId = `${violation.camera}-${violation.date}-${violation.case}`;
    
    const approvedViolations = this.getApprovedViolations();
    const deniedViolations = this.getDeniedViolations();
    
    // Add to approved, remove from denied
    approvedViolations.add(violationId);
    deniedViolations.delete(violationId);
    
    this.saveApprovedViolations(approvedViolations);
    this.saveDeniedViolations(deniedViolations);
    
    console.log(`✅ Added approval state for violation: ${violationId}`);
    
    // Emit specific event for violation approval
    this.emit('violationApproved', { violation, violationId });
    this.notify();
  }

  /**
   * Handle violation denial - remove from fines if exists and update approval state
   */
  async handleViolationDenied(violation: { camera: string; date: string; case: string }): Promise<void> {
    const violationId = `${violation.camera}-${violation.date}-${violation.case}`;
    
    // Update local state first
    const approvedViolations = this.getApprovedViolations();
    const deniedViolations = this.getDeniedViolations();
    
    // Add to denied, remove from approved
    deniedViolations.add(violationId);
    approvedViolations.delete(violationId);
    
    this.saveApprovedViolations(approvedViolations);
    this.saveDeniedViolations(deniedViolations);
    
    console.log(`❌ Added denial state for violation: ${violationId}`);
    
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
    
    // Emit specific event for violation denial
    this.emit('violationDenied', { violation, violationId });
    this.notify();
  }

  /**
   * Force refresh of approval states from backend
   */
  async forceRefresh(dateFilter: string): Promise<void> {
    try {
      const approvedFromBackend = await this.syncWithBackend(dateFilter);
      console.log(`🔄 Force refreshed approval states: ${approvedFromBackend.size} approved violations`);
      this.notify();
    } catch (error) {
      console.error('Error force refreshing approval states:', error);
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
