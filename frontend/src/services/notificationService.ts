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
 * This is the SAFE version that doesn't require database schema changes yet
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

    // 3. For now, just show toast notifications (SAFE - no DB changes)
    recipients.forEach((participantId, index) => {
      setTimeout(() => {
        toast.info(`📨 Notification Sent to Participant`, {
          description: `Session end notification sent to participant ID: ${participantId} for case ${notificationData.caseNumber}`,
          duration: 10000,
          action: {
            label: "View Details",
            onClick: () => console.log(`This notification would appear on participant ${participantId}'s screen`)
          }
        });
      }, index * 1000); // Stagger notifications
    });

    // 4. Show summary of who received notifications
    setTimeout(() => {
      toast.success(`✅ Notifications Sent`, {
        description: `Session end notifications sent to ${recipients.length} participants for case ${notificationData.caseNumber}`,
        duration: 8000
      });
    }, recipients.length * 1000 + 500);

    // 4. Log what would be saved to database (for future implementation)
    console.log('🗄️ Would save to database:', {
      notifications: recipients.map(recipientId => ({
        user_id: recipientId,
        case_id: notificationData.caseId,
        session_id: notificationData.sessionId,
        type: 'session_ended',
        title: `Session Confirmation Required - ${notificationData.caseNumber}`,
        message: `Court session for case ${notificationData.caseNumber} has ended. Please confirm to proceed.`,
        requires_confirmation: true,
        metadata: {
          caseNumber: notificationData.caseNumber,
          endedAt: notificationData.endedAt,
          notes: notificationData.notes,
          judgeId: notificationData.judgeId
        },
        priority: 'high'
      }))
    });

    return true;

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
