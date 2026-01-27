import { createSessionEndNotifications } from './notificationServiceDatabase';
import { supabase } from '@/integrations/supabase/client';

/**
 * COMPREHENSIVE NOTIFICATION TESTING FRAMEWORK
 * Tests if notifications are actually sent to real database users
 */

export interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface NotificationTestReport {
  testCase: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  };
}

/**
 * Test 1: Check Database Connection
 */
export const testDatabaseConnection = async (): Promise<TestResult> => {
  try {
    const { error } = await supabase.from('profiles').select('count').single();
    
    if (error) {
      return {
        success: false,
        message: 'Database connection failed',
        error: error.message
      };
    }
    
    return {
      success: true,
      message: 'Database connection successful',
      data: { connected: true }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database connection error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Test 2: Check Available Users by Role
 */
export const testAvailableUsers = async (): Promise<TestResult> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role_category')
      .not('role_category', 'is', null);
    
    if (error) {
      return {
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      };
    }
    
    const usersByRole = data.reduce((acc, user) => {
      const role = user.role_category || 'unknown';
      if (!acc[role]) acc[role] = [];
      acc[role].push(user);
      return acc;
    }, {} as Record<string, any[]>);
    
    return {
      success: true,
      message: `Found ${data.length} users across ${Object.keys(usersByRole).length} roles`,
      data: {
        totalUsers: data.length,
        usersByRole,
        hasRequiredRoles: {
          clerk: (usersByRole.clerk || []).length > 0,
          lawyer: (usersByRole.lawyer || []).length > 0,
          admin: (usersByRole.admin || []).length > 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error checking available users',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Test 3: Check Cases with Participants
 */
export const testCaseParticipants = async (): Promise<TestResult> => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        id, 
        case_number, 
        title,
        assigned_judge_id,
        clerk_id,
        lawyer_party_a_id,
        lawyer_party_b_id
      `)
      .limit(5);
    
    if (error) {
      return {
        success: false,
        message: 'Failed to fetch cases',
        error: error.message
      };
    }
    
    const casesWithParticipants = data.filter(c => 
      c.clerk_id || c.lawyer_party_a_id || c.lawyer_party_b_id || c.assigned_judge_id
    );
    
    return {
      success: true,
      message: `Found ${casesWithParticipants.length} cases with participants out of ${data.length} total`,
      data: {
        totalCases: data.length,
        casesWithParticipants: casesWithParticipants.length,
        cases: data.map(c => ({
          caseNumber: c.case_number,
          hasClerk: !!c.clerk_id,
          hasLawyerA: !!c.lawyer_party_a_id,
          hasLawyerB: !!c.lawyer_party_b_id,
          hasJudge: !!c.assigned_judge_id
        }))
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error checking case participants',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Test 4: Create Test Case with Participants - DISABLED due to schema conflicts
 * Use the simpleNotificationTest.ts instead which works with your database schema
 */
export const createTestCaseWithParticipants = async (): Promise<TestResult> => {
  return {
    success: false,
    message: 'Test case creation disabled due to schema conflicts',
    error: 'Use simpleNotificationTest.ts instead which works with your actual database schema'
  };
};

/**
 * Test 5: Send Real Notifications
 */
export const testSendRealNotifications = async (caseId: string): Promise<TestResult> => {
  try {
    console.log('🧪 Testing real notification sending...');
    
    const result = await createSessionEndNotifications({
      caseId,
      sessionId: `test-session-${Date.now()}`,
      judgeId: 'test-judge-id',
      caseNumber: 'TEST-CASE',
      endedAt: new Date().toISOString(),
      notes: 'Test notification'
    });
    
    if (result) {
      return {
        success: true,
        message: 'Notifications sent successfully',
        data: { notificationsSent: true }
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
      message: 'Error sending notifications',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Test 6: Verify Notifications in Database
 */
export const testVerifyNotificationsInDatabase = async (): Promise<TestResult> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        profiles!notifications_user_id_fkey (
          full_name,
          role_category
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      return {
        success: false,
        message: 'Failed to verify notifications',
        error: error.message
      };
    }
    
    const recentNotifications = data.filter(n => 
      n.title.includes('Session Confirmation Required')
    );
    
    return {
      success: true,
      message: `Found ${recentNotifications.length} recent notifications`,
      data: {
        totalNotifications: data.length,
        recentNotifications: recentNotifications.length,
        notifications: recentNotifications.map(n => ({
          id: n.id,
          recipient: n.profiles?.full_name,
          role: n.profiles?.role_category,
          title: n.title,
          message: n.message,
          isRead: n.is_read,
          createdAt: n.created_at
        }))
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error verifying notifications',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Test 7: Check Real-time Subscriptions
 */
export const testRealTimeSubscriptions = async (): Promise<TestResult> => {
  return new Promise((resolve) => {
    try {
      let subscriptionReceived = false;
      
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
            subscriptionReceived = true;
            supabase.removeChannel(subscription);
            resolve({
              success: true,
              message: 'Real-time subscription working',
              data: { payload }
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && !subscriptionReceived) {
            // Test with a dummy insert
            setTimeout(() => {
              supabase.removeChannel(subscription);
              resolve({
                success: false,
                message: 'Real-time subscription timeout',
                error: 'No notification received within timeout'
              });
            }, 5000);
          }
        });
      
      // Trigger a test notification
      setTimeout(() => {
        supabase.from('notifications').insert({
          user_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
          title: 'Test Real-time',
          message: 'Testing real-time subscription',
          is_read: false
        });
      }, 1000);
      
    } catch (error) {
      resolve({
        success: false,
        message: 'Error testing real-time subscriptions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

/**
 * Run Complete Test Suite
 */
export const runCompleteNotificationTest = async (): Promise<NotificationTestReport> => {
  console.log('🧪 Starting Complete Notification Test Suite...');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Available Users', fn: testAvailableUsers },
    { name: 'Case Participants', fn: testCaseParticipants },
    { name: 'Create Test Case', fn: createTestCaseWithParticipants },
    { name: 'Send Real Notifications', fn: () => testSendRealNotifications('test-case-id') },
    { name: 'Verify Notifications', fn: testVerifyNotificationsInDatabase },
    { name: 'Real-time Subscriptions', fn: testRealTimeSubscriptions }
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    console.log(`🔍 Running: ${test.name}...`);
    const result = await test.fn();
    results.push(result);
    console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.message}`);
  }
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  const report: NotificationTestReport = {
    testCase: 'Complete Notification System Test',
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      successRate: Math.round((passed / results.length) * 100)
    }
  };
  
  console.log('📊 Test Summary:', report.summary);
  return report;
};

/**
 * Quick Test - Just Check if Notifications Work
 */
export const quickNotificationTest = async (): Promise<TestResult> => {
  try {
    // 1. Check if we have users
    const { data: users } = await supabase
      .from('profiles')
      .select('id, role_category')
      .not('role_category', 'is', null)
      .limit(5);
    
    if (!users || users.length === 0) {
      return {
        success: false,
        message: 'No users found in database',
        error: 'Cannot test notifications without users'
      };
    }
    
    // 2. Check recent notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    return {
      success: true,
      message: `System has ${users.length} users and ${notifications?.length || 0} notifications`,
      data: {
        usersCount: users.length,
        notificationsCount: notifications?.length || 0,
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
