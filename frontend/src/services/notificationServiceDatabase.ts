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
    console.log('🔔 Starting notification creation for case:', notificationData.caseId);
    
    // 1. Get case participants
    const participants = await getCaseParticipants(notificationData.caseId);
    console.log('👥 Fetched participants:', participants);
    
    if (!participants) {
      console.error('❌ Could not fetch case participants');
      return false;
    }

    // 2. Prepare recipients (clerk + lawyers + judge)
    const recipients = [
      participants.clerkId,
      participants.lawyerPartyAId,
      participants.lawyerPartyBId,
      notificationData.judgeId,
    ]
      .filter(Boolean) // Remove null values
      .filter((id, index, self) => self.indexOf(id) === index); // Deduplicate

    console.log('📋 Notification recipients:', recipients);
    console.log('📋 Creating REAL notifications in database:', {
      recipients,
      caseNumber: notificationData.caseNumber,
      sessionId: notificationData.sessionId
    });

    if (recipients.length === 0) {
      console.warn('⚠️ No valid recipients found for notification');
      return false;
    }

    // 3. Create notifications in DATABASE for each recipient
    const notificationPromises = recipients.map(async (recipientId) => {
      // Use existing notifications table structure
      const notificationRecord = {
        user_id: recipientId!,
        title: `Session Confirmation Required - ${notificationData.caseNumber}`,
        message: `Court session for case ${notificationData.caseNumber} has ended. Please confirm to proceed with blockchain recording.`,
        is_read: false,
        case_id: notificationData.caseId,
        session_id: notificationData.sessionId,
        requires_confirmation: true,
        metadata: {
          caseId: notificationData.caseId,
          sessionId: notificationData.sessionId,
          caseNumber: notificationData.caseNumber,
          endedAt: notificationData.endedAt,
          notes: notificationData.notes,
          judgeId: notificationData.judgeId,
        }
      };

      console.log('📝 Creating notification record:', notificationRecord);

      const result = await supabase
        .from('notifications')
        .insert(notificationRecord)
        .select()
        .single();

      console.log('📊 Notification creation result for recipient', recipientId, ':', result);

      if (result.error) {
        throw result.error;
      }

      return result;
    });

    // 4. Execute all notification creations
    const results = await Promise.allSettled(notificationPromises);
    
    // 5. Check results and log detailed errors
    console.log('📋 All notification results:', results);
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    // Log detailed error information
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Notification ${index} failed:`, result.reason);
      } else {
        console.log(`✅ Notification ${index} created successfully:`, result.value.data);
      }
    });

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
export const getUserNotifications = async (userId: string, unreadOnly: boolean = false) => {
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
    return data || [];
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
