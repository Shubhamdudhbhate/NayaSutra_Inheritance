import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type SessionStatus = 'active' | 'ended' | 'paused' | 'scheduled';
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
  const [scheduledSession, setScheduledSession] = useState<CourtSession | null>(null);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [myPermission, setMyPermission] = useState<PermissionRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlockchainLoading, setIsBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);

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
      // First check for active session
      const { data: activeSession, error: activeError } = await supabase
        .from('session_logs')
        .select('*')
        .eq('case_id', caseId)
        .eq('status', 'active')
        .maybeSingle();

      if (activeError) {
        console.error('Error fetching active session:', activeError);
      } else if (activeSession) {
        setActiveSession(activeSession);
      } else {
        // No active session, check for scheduled sessions
        const { data: scheduledSessionData, error: scheduledError } = await supabase
          .from('session_logs')
          .select('*')
          .eq('case_id', caseId)
          .eq('status', 'scheduled' as any) // Type assertion for 'scheduled'
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scheduledError) {
          console.error('Error fetching scheduled session:', scheduledError);
        }
        
        // Store scheduled session but don't set as active
        setScheduledSession(scheduledSessionData);
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

    setIsLoading(true);
    setIsBlockchainLoading(true);
    setBlockchainError(null);

    try {
      console.log('🚀 Starting new court session for case:', caseId);
      
      // Check for scheduled sessions within ±20 minutes
      const now = new Date();
      const twentyMinutesBefore = new Date(now.getTime() - 20 * 60 * 1000);
      const twentyMinutesAfter = new Date(now.getTime() + 20 * 60 * 1000);

      const { data: nearbyScheduledSessions, error: scheduledError } = await supabase
        .from('session_logs')
        .select('*')
        .eq('case_id', caseId)
        .eq('status', 'scheduled' as any)
        .gte('started_at', twentyMinutesBefore.toISOString())
        .lte('started_at', twentyMinutesAfter.toISOString())
        .order('started_at', { ascending: true })
        .limit(1);

      if (scheduledError) {
        console.error('❌ Error checking scheduled sessions:', scheduledError);
      }

      // If found a scheduled session within the time window, activate it
      if (nearbyScheduledSessions && nearbyScheduledSessions.length > 0) {
        const scheduledSession = nearbyScheduledSessions[0];
        console.log('📅 Found scheduled session within ±20 minutes:', scheduledSession.id);
        console.log('Scheduled time:', scheduledSession.started_at);
        console.log('Current time:', now.toISOString());

        const { error: updateError } = await supabase
          .from('session_logs')
          .update({
            status: 'active',
            started_at: now.toISOString(), // Update to actual start time
            updated_at: now.toISOString()
          })
          .eq('id', scheduledSession.id);

        if (updateError) {
          console.error('❌ Error activating scheduled session:', updateError);
          toast.error('Failed to activate scheduled session');
          return null;
        }

        const activatedSession: CourtSession = {
          ...scheduledSession,
          status: 'active',
          started_at: now.toISOString()
        };

        setActiveSession(activatedSession);
        setScheduledSession(null);
        
        // Update case status to "hearing" if it was "pending"
        await supabase
          .from('cases')
          .update({ status: 'hearing' })
          .eq('id', caseId)
          .eq('status', 'pending');
        
        const scheduledTime = new Date(scheduledSession.started_at);
        const diffMinutes = Math.round((now.getTime() - scheduledTime.getTime()) / (1000 * 60));
        const timeRelation = diffMinutes < 0 ? `starts in ${Math.abs(diffMinutes)} min` : `started ${diffMinutes} min ago`;
        
        toast.success(`Scheduled session activated (${timeRelation})`);
        console.log('✅ Scheduled session activated successfully');
        return activatedSession;
      }

      // No nearby scheduled session found, create new one
      console.log('📅 No scheduled session found within ±20 minutes, creating new session');
      
      // First, create session in database
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
        console.error('❌ Error creating session in database:', error);
        toast.error('Failed to start court session');
        return null;
      }

      console.log('✅ Database session created successfully:', session);

      // Update case status to "hearing" if it was "pending"
      await supabase
        .from('cases')
        .update({ status: 'hearing' })
        .eq('id', caseId)
        .eq('status', 'pending');

      // Blockchain finalization happens later via judgeFinalizeSession
      // when judge signs and session is finalized

      setActiveSession(session);
      toast.success('Court session started');
      return session;
    } catch (error) {
      console.error('❌ Error starting session:', error);
      toast.error('Failed to start court session');
      return null;
    } finally {
      setIsLoading(false);
      setIsBlockchainLoading(false);
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

  const activateScheduledSession = async () => {
    if (!scheduledSession || !isJudge) {
      toast.error('No scheduled session to activate or you are not a judge');
      return false;
    }

    try {
      const { error } = await supabase
        .from('session_logs')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduledSession.id);

      if (error) throw error;

      // Update case status to "hearing" if it was "pending"
      await supabase
        .from('cases')
        .update({ status: 'hearing' })
        .eq('id', caseId)
        .eq('status', 'pending');

      // Refresh to pick up the now-active session
      await fetchSession();
      
      toast.success('Scheduled session activated successfully');
      return true;
    } catch (error) {
      console.error('Error activating scheduled session:', error);
      toast.error('Failed to activate scheduled session');
      return false;
    }
  };

  return {
    activeSession,
    scheduledSession,
    permissionRequests,
    myPermission,
    isLoading,
    isBlockchainLoading,
    blockchainError,
    isJudge,
    canUpload,
    isSessionActive: !!activeSession,
    startSession,
    endSession,
    updateNotes,
    requestPermission,
    respondToPermission,
    activateScheduledSession,
    refreshSession: fetchSession,
    refreshPermissions: () => fetchPermissions(activeSession?.id),
  };
};
