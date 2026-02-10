import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
    if (!caseId) {
      setIsLoading(false);
      return null;
    }

    try {
      const { data: session, error } = await supabase
        .from('session_logs')
        .select('*')
        .eq('case_id', caseId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error fetching session:', error);
      } else if (session) {
        setActiveSession(session);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [caseId]);

  // Fetch session on mount
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const fetchPermissions = useCallback(async (_sessionId?: string) => {
    setPermissionRequests([]);
    setMyPermission(null);
  }, []);

  const startSession = async () => {
    if (!isJudge || !profile?.id) {
      toast.error('Only judges can start a court session');
      return null;
    }

    try {
      console.log('🚀 Starting new court session for case:', caseId);
      
      const { data: session, error } = await supabase
        .from('session_logs')
        .insert({
          case_id: caseId,
          judge_id: profile.id,
          status: 'active',
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating session:', error);
        toast.error('Failed to start court session');
        return null;
      }

      console.log('✅ Session created successfully:', session);
      setActiveSession(session);
      toast.success('Court session started');
      return session;
    } catch (error) {
      console.error('❌ Error starting session:', error);
      toast.error('Failed to start court session');
      return null;
    }
  };

  const endSession = async (notes?: string) => {
    if (!isJudge || !activeSession || !profile?.id) {
      toast.error('Cannot end session');
      return false;
    }

    try {
      console.log('🛑 Ending court session:', activeSession.id);
      
      const { error } = await supabase
        .from('session_logs')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSession.id);

      if (error) {
        console.error('❌ Error ending session:', error);
        toast.error('Failed to end court session');
        return false;
      }

      console.log('✅ Session ended successfully');
      setActiveSession(null);
      toast.success('Court session ended');
      return true;
    } catch (error) {
      console.error('❌ Error ending session:', error);
      toast.error('Failed to end court session');
      return false;
    }
  };

  const updateNotes = async (notes: string) => {
    if (!activeSession) return false;

    try {
      console.log('📝 Updating session notes:', activeSession.id);
      
      const { error } = await supabase
        .from('session_logs')
        .update({
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSession.id);

      if (error) {
        console.error('❌ Error updating notes:', error);
        return false;
      }

      console.log('✅ Notes updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating notes:', error);
      return false;
    }
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
