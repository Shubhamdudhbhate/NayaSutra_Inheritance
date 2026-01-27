import { createSessionEndNotifications } from './notificationServiceDatabase';
import { supabase } from '@/integrations/supabase/client';

/**
 * SIMPLE NOTIFICATION TESTING FRAMEWORK
 * Tests if notifications are actually sent to real database users
 */

export interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Quick Test - Check if system can send notifications
 */
export const quickNotificationTest = async (): Promise<TestResult> => {
  try {
    // 1. Check if we have users
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, role_category')
      .not('role_category', 'is', null)
      .limit(5);
    
    if (userError) {
      return {
        success: false,
        message: 'Failed to fetch users',
        error: userError.message
      };
    }
    
    if (!users || users.length === 0) {
      return {
        success: false,
        message: 'No users found in database',
        error: 'Cannot test notifications without users'
      };
    }
    
    // 2. Check recent notifications
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (notifError) {
      return {
        success: false,
        message: 'Failed to fetch notifications',
        error: notifError.message
      };
    }
    
    // 3. Check cases with participants
    const { data: cases, error: caseError } = await supabase
      .from('cases')
      .select('id, case_number, assigned_judge_id, clerk_id, lawyer_party_a_id, lawyer_party_b_id')
      .limit(3);
    
    if (caseError) {
      return {
        success: false,
        message: 'Failed to fetch cases',
        error: caseError.message
      };
    }
    
    const casesWithParticipants = cases?.filter(c => 
      c.clerk_id || c.lawyer_party_a_id || c.lawyer_party_b_id
    ) || [];
    
    return {
      success: true,
      message: `System ready: ${users.length} users, ${notifications?.length || 0} notifications, ${casesWithParticipants.length} cases with participants`,
      data: {
        usersCount: users.length,
        notificationsCount: notifications?.length || 0,
        casesWithParticipants: casesWithParticipants.length,
        usersByRole: users.reduce((acc, user) => {
          const role = user.role_category || 'unknown';
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recentNotifications: notifications?.slice(0, 3)
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Quick test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Test Real Notification Sending
 */
export const testRealNotificationSending = async (caseId?: string): Promise<TestResult> => {
  try {
    // First get a case with participants
    let targetCaseId = caseId;
    
    if (!targetCaseId) {
      const { data: cases } = await supabase
        .from('cases')
        .select('id, case_number, clerk_id, lawyer_party_a_id, lawyer_party_b_id')
        .or('clerk_id.not.is.null,lawyer_party_a_id.not.is.null,lawyer_party_b_id.not.is.null')
        .limit(1);
      
      if (!cases || cases.length === 0) {
        return {
          success: false,
          message: 'No cases with participants found',
          error: 'Cannot test notifications without a case that has participants'
        };
      }
      
      targetCaseId = cases[0].id;
    }
    
    console.log(`🧪 Testing notification sending for case: ${targetCaseId}`);
    
    // Send the notification
    const result = await createSessionEndNotifications({
      caseId: targetCaseId,
      sessionId: `test-session-${Date.now()}`,
      judgeId: 'test-judge-id',
      caseNumber: 'TEST-CASE',
      endedAt: new Date().toISOString(),
      notes: 'Test notification from testing framework'
    });
    
    if (result) {
      // Verify the notification was created
      const { data: newNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('title', 'Session Confirmation Required - TEST-CASE')
        .order('created_at', { ascending: false })
        .limit(5);
      
      return {
        success: true,
        message: `Notification sent successfully! ${newNotifications?.length || 0} notifications created`,
        data: {
          notificationsCreated: newNotifications?.length || 0,
          testCaseId: targetCaseId,
          notifications: newNotifications
        }
      };
    } else {
      return {
        success: false,
        message: 'Failed to send notifications',
        error: 'Notification service returned false'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error testing notification sending',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Test Real-time Subscriptions
 */
export const testRealTimeNotifications = async (): Promise<TestResult> => {
  return new Promise((resolve) => {
    try {
      let notificationReceived = false;
      let timeoutId: NodeJS.Timeout;
      
      const subscription = supabase
        .channel('notification-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
          },
          (payload) => {
            console.log('🔔 Real-time notification received:', payload);
            notificationReceived = true;
            clearTimeout(timeoutId);
            supabase.removeChannel(subscription);
            resolve({
              success: true,
              message: 'Real-time subscription working! Notification received',
              data: { payload }
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('📡 Real-time subscription active');
            
            // Set timeout
            timeoutId = setTimeout(() => {
              if (!notificationReceived) {
                supabase.removeChannel(subscription);
                resolve({
                  success: false,
                  message: 'Real-time subscription timeout',
                  error: 'No notification received within 5 seconds'
                });
              }
            }, 5000);
            
            // Trigger a test notification
            setTimeout(async () => {
              try {
                await supabase.from('notifications').insert({
                  user_id: '00000000-0000-0000-0000-000000000000', // Dummy ID for testing
                  title: 'Real-time Test',
                  message: 'Testing real-time subscription',
                  is_read: false
                });
              } catch (error) {
                console.log('Test notification insert error (expected):', error);
              }
            }, 1000);
          }
        });
      
    } catch (error) {
      resolve({
        success: false,
        message: 'Error testing real-time notifications',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

/**
 * Complete Test Suite
 */
export const runCompleteTest = async (): Promise<{
  quickTest: TestResult;
  realNotificationTest: TestResult;
  realTimeTest: TestResult;
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  };
}> => {
  console.log('🧪 Starting Complete Notification Test Suite...');
  
  const quickTest = await quickNotificationTest();
  const realNotificationTest = await testRealNotificationSending();
  const realTimeTest = await testRealTimeNotifications();
  
  const tests = [quickTest, realNotificationTest, realTimeTest];
  const passed = tests.filter(t => t.success).length;
  const failed = tests.filter(t => !t.success).length;
  
  const summary = {
    total: tests.length,
    passed,
    failed,
    successRate: Math.round((passed / tests.length) * 100)
  };
  
  console.log('📊 Test Summary:', summary);
  
  return {
    quickTest,
    realNotificationTest,
    realTimeTest,
    summary
  };
};
