import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SessionEndNotification {
  caseId: string;
  sessionId: string;
  judgeId: string;
  caseNumber: string;
  endedAt: string;
  notes?: string;
}

export interface CaseParticipants {
  clerkId?: string;
  lawyerPartyAId?: string;
  lawyerPartyBId?: string;
  judgeId: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  requires_confirmation: boolean;
  session_id?: string;
  confirmed_at?: string;
  confirmed_by?: string;
  metadata: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

/**
 * Get all participants for a case (excluding the judge who ended session)
 */
export const getCaseParticipants = async (caseId: string): Promise<CaseParticipants | null> => {
  try {
    const { data: caseData, error } = await supabase
      .from('cases')
      .select(`
        clerk_id,
        lawyer_party_a_id,
        lawyer_party_b_id,
        assigned_judge_id
      `)
      .eq('id', caseId)
      .single();

    if (error) throw error;
    if (!caseData) throw new Error('Case not found');

    return {
      clerkId: caseData.clerk_id || undefined,
      lawyerPartyAId: caseData.lawyer_party_a_id || undefined,
      lawyerPartyBId: caseData.lawyer_party_b_id || undefined,
      judgeId: caseData.assigned_judge_id || ''
    };
  } catch (error) {
    console.error('Error fetching case participants:', error);
    return null;
  }
};

/**
 * Create REAL session end notifications in database
 */
export const createSessionEndNotifications = async (
  notificationData: SessionEndNotification
): Promise<boolean> => {
  try {
    // 1. Get case participants
    const participants = await getCaseParticipants(notificationData.caseId);
    if (!participants) {
      console.error('Could not fetch case participants');
      return false;
    }

    // 2. Prepare recipients (clerk + lawyers, NOT the judge)
    const recipients = [
      participants.clerkId,
      participants.lawyerPartyAId, 
      participants.lawyerPartyBId
    ].filter(Boolean) // Remove null values
     .filter(id => id !== notificationData.judgeId); // Exclude judge

    console.log('📋 Creating REAL notifications in database:', {
      recipients,
      caseNumber: notificationData.caseNumber,
      sessionId: notificationData.sessionId
    });

    // 3. Create notifications in DATABASE for each recipient
    const notificationPromises = recipients.map(async (recipientId) => {
      if (!recipientId) return null; // Skip undefined recipients
      
      const notificationRecord = {
        user_id: recipientId, // Now guaranteed to be string
        title: `Session Confirmation Required - ${notificationData.caseNumber}`,
        message: `Court session for case ${notificationData.caseNumber} has ended. Please confirm to proceed with blockchain recording.`,
        is_read: false,
        requires_confirmation: true,
        session_id: notificationData.sessionId,
        metadata: {
          caseNumber: notificationData.caseNumber,
          caseId: notificationData.caseId,
          endedAt: notificationData.endedAt,
          notes: notificationData.notes,
          judgeId: notificationData.judgeId,
          type: 'session_ended'
        },
        priority: 'high' as const
      };

      return await supabase
        .from('notifications')
        .insert(notificationRecord)
        .select()
        .single();
    }).filter(Boolean); // Remove null promises

    // 4. Execute all notification creations
    const results = await Promise.allSettled(notificationPromises);
    
    // 5. Check results
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    console.log(`📨 Notifications created: ${successful} successful, ${failed} failed`);

    if (successful > 0) {
      toast.success(`Notifications sent to ${successful} participants`, {
        description: `Session end notifications sent for case ${notificationData.caseNumber}`,
        duration: 5000
      });
      return true;
    } else {
      toast.error('Failed to send notifications');
      return false;
    }

  } catch (error) {
    console.error('Error creating session end notifications:', error);
    toast.error('Failed to send notifications to participants');
    return false;
  }
};

/**
 * Get notifications for current user
 */
export const getUserNotifications = async (userId: string, unreadOnly: boolean = false): Promise<NotificationRecord[]> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform database types to NotificationRecord interface
    return (data || [] ).map(item => ({
      ...item,
      is_read: item.is_read ?? false, // Convert null to false
      requires_confirmation: item.requires_confirmation ?? false,
      priority: (item.priority as 'low' | 'normal' | 'high' | 'urgent') ?? 'normal',
      session_id: item.session_id || undefined, // Convert null to undefined
      confirmed_at: item.confirmed_at || undefined, // Convert null to undefined
      confirmed_by: item.confirmed_by || undefined, // Convert null to undefined
      created_at: item.created_at || new Date().toISOString() // Convert null to string
    }));
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Confirm session end (creates session confirmation record)
 */
export const confirmSessionEnd = async (
  sessionId: string,
  participantId: string
): Promise<boolean> => {
  try {
    console.log('✅ Participant confirming session end:', {
      sessionId,
      participantId,
      confirmedAt: new Date().toISOString()
    });

    // 1. Create session confirmation record
    const { error: confirmationError } = await supabase
      .from('session_confirmations')
      .upsert({
        session_id: sessionId,
        participant_id: participantId,
        confirmed: true,
        confirmed_at: new Date().toISOString()
      });

    if (confirmationError) throw confirmationError;

    // 2. Update the notification as confirmed
    const { error: notificationError } = await supabase
      .from('notifications')
      .update({ 
        confirmed_at: new Date().toISOString(),
        confirmed_by: participantId
      })
      .eq('session_id', sessionId)
      .eq('user_id', participantId);

    if (notificationError) throw notificationError;

    toast.success('Session end confirmed successfully!');
    return true;

  } catch (error) {
    console.error('Error confirming session end:', error);
    toast.error('Failed to confirm session end');
    return false;
  }
};

/**
 * Check if all participants have confirmed session end
 */
export const checkAllParticipantsConfirmed = async (
  sessionId: string
): Promise<boolean> => {
  try {
    // Get total participants for this session
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('requires_confirmation', true);

    if (notifError) throw notifError;

    const totalParticipants = notifications?.length || 0;
    if (totalParticipants === 0) return false;

    // Get confirmed participants
    const { data: confirmations, error: confError } = await supabase
      .from('session_confirmations')
      .select('participant_id')
      .eq('session_id', sessionId)
      .eq('confirmed', true);

    if (confError) throw confError;

    const confirmedParticipants = confirmations?.length || 0;

    console.log('🔍 Confirmation check:', {
      sessionId,
      totalParticipants,
      confirmedParticipants,
      allConfirmed: confirmedParticipants >= totalParticipants
    });

    return confirmedParticipants >= totalParticipants;

  } catch (error) {
    console.error('Error checking confirmations:', error);
    return false;
  }
};

/**
 * Get unread notification count for user
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
};
