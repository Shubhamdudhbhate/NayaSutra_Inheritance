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
 * Create session end notifications for all participants (clerk + lawyers)
 * This version saves to database for real notifications
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

    console.log('📋 Sending notifications to participants:', {
      recipients,
      caseNumber: notificationData.caseNumber,
      sessionId: notificationData.sessionId,
      judgeId: notificationData.judgeId
    });

    console.log('👥 Recipient Details:', {
      clerkId: participants.clerkId,
      lawyerPartyAId: participants.lawyerPartyAId,
      lawyerPartyBId: participants.lawyerPartyBId,
      totalRecipients: recipients.length
    });

    // 3. Create notifications in database
    const notificationPromises = recipients.map((recipientId) => {
      if (!recipientId) return Promise.reject(new Error('Invalid recipient ID'));
      
      // Determine party role based on recipient
      let party: string | undefined;
      if (recipientId === participants.lawyerPartyAId) {
        party = 'prosecution'; // Party A is plaintiff/prosecution
      } else if (recipientId === participants.lawyerPartyBId) {
        party = 'defendant'; // Party B is defendant/defence
      }
      
      return supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          case_id: notificationData.caseId,
          type: 'session_ended',
          title: `Session Confirmation Required - ${notificationData.caseNumber}`,
          message: `Court session for case ${notificationData.caseNumber} has ended. Please sign in with MetaMask to confirm and proceed.`,
          requires_confirmation: true,
          metadata: {
            caseNumber: notificationData.caseNumber,
            sessionId: notificationData.sessionId,
            endedAt: notificationData.endedAt,
            notes: notificationData.notes,
            judgeId: notificationData.judgeId,
            party: party // Add party metadata for lawyer categorization
          },
          priority: 'high',
          is_read: false
        });
    });

    // Execute all insertions
    const results = await Promise.allSettled(notificationPromises);
    
    // Check for any failures
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.error('Some notifications failed to save:', failures);
      toast.error(`Failed to send ${failures.length} notifications`);
    }

    // 4. Show success message
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    if (successCount > 0) {
      toast.success(`✅ Notifications Sent`, {
        description: `Session end notifications sent to ${successCount} participants for case ${notificationData.caseNumber}`,
        duration: 8000
      });
    }

    return successCount > 0;

  } catch (error) {
    console.error('Error creating session end notifications:', error);
    toast.error('Failed to send notifications to participants');
    return false;
  }
};

/**
 * Mock confirmation function (SAFE - no DB changes yet)
 */
export const confirmSessionEnd = async (
  sessionId: string,
  participantId: string
): Promise<boolean> => {
  try {
    console.log('✅ Participant would confirm session end:', {
      sessionId,
      participantId,
      confirmedAt: new Date().toISOString()
    });

    toast.success('Session end confirmed!');

    // TODO: Check if all participants have confirmed
    // TODO: Trigger judge blockchain signing if all confirmed

    return true;
  } catch (error) {
    console.error('Error confirming session end:', error);
    toast.error('Failed to confirm session end');
    return false;
  }
};

/**
 * Check if all participants have confirmed (SAFE version)
 */
export const checkAllParticipantsConfirmed = async (
  sessionId: string
): Promise<boolean> => {
  try {
    console.log('🔍 Checking if all participants confirmed for session:', sessionId);
    
    // TODO: Query session_confirmations table
    // For now, return false (not all confirmed)
    return false;
  } catch (error) {
    console.error('Error checking confirmations:', error);
    return false;
  }
};
