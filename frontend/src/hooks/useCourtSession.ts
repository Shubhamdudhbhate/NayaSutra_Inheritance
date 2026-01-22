import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type SessionStatus = 'active' | 'ended' | 'paused';
type PermissionStatus = 'pending' | 'granted' | 'denied' | 'expired';

export interface CourtSession {
  id: string;
  case_id: string;
  judge_id: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionRequest {
  id: string;
  session_id: string;
  case_id: string;
  requester_id: string;
  status: PermissionStatus;
  requested_at: string;
  responded_at: string | null;
  responded_by: string | null;
  requester_name?: string;
}

export const useCourtSession = (caseId: string) => {
  const { profile } = useAuth();
  const [activeSession, setActiveSession] = useState<CourtSession | null>(null);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [myPermission, setMyPermission] = useState<PermissionRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isJudge = profile?.role_category === 'judiciary' || profile?.role_category === 'judge';
  const canUpload = myPermission?.status === 'granted' || isJudge;

  // Mark caseId as used to avoid lint warning
  void caseId;

  // TODO: Implement when session_logs and permission_requests tables are created
  // For now, return mock/empty states

  const fetchSession = useCallback(async () => {
    setIsLoading(false);
    return null;
  }, []);

  const fetchPermissions = useCallback(async (_sessionId?: string) => {
    setPermissionRequests([]);
    setMyPermission(null);
  }, []);

  const startSession = async () => {
    if (!isJudge || !profile?.id) {
      toast.error('Only judges can start a court session');
      return null;
    }

    // Mock session creation
    const mockSession: CourtSession = {
      id: `session-${Date.now()}`,
      case_id: caseId,
      judge_id: profile.id,
      status: 'active',
      started_at: new Date().toISOString(),
      ended_at: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setActiveSession(mockSession);
    toast.success('Court session started');
    return mockSession;
  };

  const endSession = async (_notes?: string) => {
    if (!isJudge || !activeSession || !profile?.id) {
      toast.error('Cannot end session');
      return false;
    }

    setActiveSession(null);
    toast.success('Court session ended');
    return true;
  };

  const updateNotes = async (_notes: string) => {
    if (!activeSession) return false;
    return true;
  };

  const requestPermission = async () => {
    if (!activeSession || !profile?.id) {
      toast.error('No active session');
      return null;
    }

    toast.info('Permission functionality will be available once permission_requests table is created');
    return null;
  };

  const respondToPermission = async (_requestId: string, _grant: boolean) => {
    if (!isJudge || !profile?.id) {
      toast.error('Only judges can respond to permission requests');
      return false;
    }

    return false;
  };

  return {
    activeSession,
    permissionRequests,
    myPermission,
    isLoading,
    isJudge,
    canUpload,
    isSessionActive: !!activeSession,
    startSession,
    endSession,
    updateNotes,
    requestPermission,
    respondToPermission,
    refreshSession: fetchSession,
    refreshPermissions: () => fetchPermissions(activeSession?.id),
  };
};
