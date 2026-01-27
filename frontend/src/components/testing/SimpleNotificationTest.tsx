import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Play, Database, Bell, Radio } from 'lucide-react';
import { 
  runCompleteTest, 
  quickNotificationTest,
  testRealNotificationSending,
  testRealTimeNotifications,
  TestResult 
} from '@/services/simpleNotificationTest';

export const SimpleNotificationTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [quickResult, setQuickResult] = useState<TestResult | null>(null);
  const [realResult, setRealResult] = useState<TestResult | null>(null);
  const [realTimeResult, setRealTimeResult] = useState<TestResult | null>(null);

  const runQuickTest = async () => {
    setIsRunning(true);
    try {
      const result = await quickNotificationTest();
      setQuickResult(result);
      console.log('Quick Test Result:', result);
    } catch (error) {
      setQuickResult({
        success: false,
        message: 'Quick test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runRealTest = async () => {
    setIsRunning(true);
    try {
      const result = await testRealNotificationSending();
      setRealResult(result);
      console.log('Real Notification Test Result:', result);
    } catch (error) {
      setRealResult({
        success: false,
        message: 'Real notification test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runRealTimeTest = async () => {
    setIsRunning(true);
    try {
      const result = await testRealTimeNotifications();
      setRealTimeResult(result);
      console.log('Real-time Test Result:', result);
    } catch (error) {
      setRealTimeResult({
        success: false,
        message: 'Real-time test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    try {
      const results = await runCompleteTest();
      setQuickResult(results.quickTest);
      setRealResult(results.realNotificationTest);
      setRealTimeResult(results.realTimeTest);
      console.log('Complete Test Results:', results);
    } catch (error) {
      console.error('Complete test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const TestResultCard = ({ 
    title, 
    description, 
    result, 
    onTest, 
    icon 
  }: { 
    title: string; 
    description: string; 
    result: TestResult | null; 
    onTest: () => void; 
    icon: React.ReactNode;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onTest} disabled={isRunning} className="w-full mb-3">
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            'Run Test'
          )}
        </Button>
        
        {result && (
          <div className="p-3 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="font-medium">{result.message}</span>
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? "PASS" : "FAIL"}
              </Badge>
            </div>
            
            {result.data && (
              <div className="text-sm text-muted-foreground space-y-1">
                {result.data.usersCount !== undefined && (
                  <div>Users: {result.data.usersCount}</div>
                )}
                {result.data.notificationsCount !== undefined && (
                  <div>Notifications: {result.data.notificationsCount}</div>
                )}
                {result.data.casesWithParticipants !== undefined && (
                  <div>Cases with participants: {result.data.casesWithParticipants}</div>
                )}
                {result.data.notificationsCreated !== undefined && (
                  <div>Notifications created: {result.data.notificationsCreated}</div>
                )}
                {result.data.usersByRole && (
                  <div>Roles: {JSON.stringify(result.data.usersByRole)}</div>
                )}
              </div>
            )}
            
            {result.error && (
              <div className="text-sm text-red-500 mt-2">
                Error: {result.error}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Testing Framework</h1>
          <p className="text-muted-foreground">
            Test if notifications are actually sent to real database users
          </p>
        </div>
        <Button onClick={runAllTests} disabled={isRunning} size="lg">
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running All Tests...
            </>
          ) : (
            'Run All Tests'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TestResultCard
          title="Quick Test"
          description="Check system status and available users"
          result={quickResult}
          onTest={runQuickTest}
          icon={<Database className="w-5 h-5" />}
        />
        
        <TestResultCard
          title="Real Notifications"
          description="Send actual notifications to users"
          result={realResult}
          onTest={runRealTest}
          icon={<Bell className="w-5 h-5" />}
        />
        
        <TestResultCard
          title="Real-time Test"
          description="Test real-time notification delivery"
          result={realTimeResult}
          onTest={runRealTimeTest}
          icon={<Radio className="w-5 h-5" />}
        />
      </div>

      {/* Summary */}
      {(quickResult || realResult || realTimeResult) && (
        <Card>
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">
                  {[quickResult, realResult, realTimeResult].filter(r => r).length}
                </div>
                <div className="text-sm text-blue-600">Tests Run</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">
                  {[quickResult, realResult, realTimeResult].filter(r => r?.success).length}
                </div>
                <div className="text-sm text-green-600">Passed</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50">
                <div className="text-2xl font-bold text-red-600">
                  {[quickResult, realResult, realTimeResult].filter(r => r && !r.success).length}
                </div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
