import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const NotificationTabTest = () => {
  const [userId, setUserId] = useState('test-user-123');
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const createTestNotification = async () => {
    setIsCreating(true);
    try {
      const notificationData = {
        user_id: userId,
        type: 'session_ended',
        title: 'Session Confirmation Required',
        message: 'Court session has ended. Please sign to confirm.',
        requires_confirmation: true,
        metadata: {
          caseId: 'test-case-456',
          sessionId: 'session-789',
          caseNumber: 'CASE-123',
          endedAt: new Date().toISOString()
        },
        priority: 'high',
        is_read: false
      };

      console.log('🔔 Creating test notification:', notificationData);

      const { error, data } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Test notification created:', data);
      toast.success('Test notification created! Check the NotificationTab.');
    } catch (error) {
      console.error('Error creating test notification:', error);
      toast.error('Failed to create test notification');
    } finally {
      setIsCreating(false);
    }
  };

  const checkExistingNotifications = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('📋 Existing notifications for user:', userId, data);
      toast.info(`Found ${data?.length || 0} notifications. Check console for details.`);
    } catch (error) {
      console.error('Error checking notifications:', error);
      toast.error('Failed to check notifications');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>NotificationTab Test</CardTitle>
        <CardDescription>
          Create a test session end notification to verify the signing functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userId">Test User ID</Label>
          <Input
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID for notification"
          />
        </div>
        <div className="space-y-2">
          <Button 
            onClick={createTestNotification}
            disabled={isCreating || !userId}
            className="w-full"
          >
            {isCreating ? 'Creating Test Notification...' : 'Create Test Notification'}
          </Button>
          <Button 
            onClick={checkExistingNotifications}
            disabled={isChecking || !userId}
            variant="outline"
            className="w-full"
          >
            {isChecking ? 'Checking...' : 'Check Existing Notifications'}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>• This creates a session end notification</p>
          <p>• Check the NotificationTab component</p>
          <p>• "Sign All" button should appear</p>
          <p>• Individual sign buttons should appear on notifications</p>
          <p>• Clicking sign will open MetaMask</p>
        </div>
      </CardContent>
    </Card>
  );
};
