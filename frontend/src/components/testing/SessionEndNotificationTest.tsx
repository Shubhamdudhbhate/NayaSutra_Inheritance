import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createSessionEndNotifications } from '@/services/notificationService';

export const SessionEndNotificationTest = () => {
  const [testCaseId, setTestCaseId] = useState('test-case-123');
  const [testJudgeId, setTestJudgeId] = useState('judge-456');
  const [isSending, setIsSending] = useState(false);

  const handleSendTestNotification = async () => {
    setIsSending(true);
    try {
      const success = await createSessionEndNotifications({
        caseId: testCaseId,
        sessionId: `test-session-${Date.now()}`,
        judgeId: testJudgeId,
        caseNumber: `TEST-${testCaseId.substring(0, 6).toUpperCase()}`,
        endedAt: new Date().toISOString(),
        notes: 'This is a test notification for session end'
      });

      if (success) {
        toast.success('Test notification sent successfully! Check your notifications panel.');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Error sending test notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Session End Notification Test</CardTitle>
        <CardDescription>
          Send a test session end notification to verify the complete flow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="caseId">Test Case ID</Label>
          <Input
            id="caseId"
            value={testCaseId}
            onChange={(e) => setTestCaseId(e.target.value)}
            placeholder="Enter test case ID"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="judgeId">Test Judge ID</Label>
          <Input
            id="judgeId"
            value={testJudgeId}
            onChange={(e) => setTestJudgeId(e.target.value)}
            placeholder="Enter test judge ID"
          />
        </div>
        <Button 
          onClick={handleSendTestNotification}
          disabled={isSending || !testCaseId || !testJudgeId}
          className="w-full"
        >
          {isSending ? 'Sending Test Notification...' : 'Send Test Notification'}
        </Button>
        <div className="text-xs text-muted-foreground">
          <p>• This will create notifications in the database</p>
          <p>• Check your notifications panel to see the result</p>
          <p>• The notification will include a MetaMask sign-in button</p>
        </div>
      </CardContent>
    </Card>
  );
};
