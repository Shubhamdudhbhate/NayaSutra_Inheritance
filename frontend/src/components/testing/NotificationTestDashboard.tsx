import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, Play, Database, Users, Bell, Radio } from 'lucide-react';
import { 
  runCompleteNotificationTest, 
  quickNotificationTest,
  NotificationTestReport,
  TestResult 
} from '@/services/notificationTestFramework';

export const NotificationTestDashboard = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testReport, setTestReport] = useState<NotificationTestReport | null>(null);
  const [quickTest, setQuickTest] = useState<TestResult | null>(null);

  const runQuickTest = async () => {
    setIsRunning(true);
    try {
      const result = await quickNotificationTest();
      setQuickTest(result);
    } catch (error) {
      setQuickTest({
        success: false,
        message: 'Quick test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runFullTest = async () => {
    setIsRunning(true);
    try {
      const report = await runCompleteNotificationTest();
      setTestReport(report);
    } catch (error) {
      setTestReport({
        testCase: 'Complete Notification System Test',
        results: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          successRate: 0
        }
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getTestIcon = (success: boolean) => {
    return success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getTestBadge = (success: boolean) => {
    return success ? (
      <Badge variant="default" className="bg-green-500">PASS</Badge>
    ) : (
      <Badge variant="destructive">FAIL</Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Testing Framework</h1>
          <p className="text-muted-foreground">
            Test if notifications are actually sent to real database users
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Quick Test
            </CardTitle>
            <CardDescription>
              Fast check of basic notification system status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runQuickTest} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Quick Test...
                </>
              ) : (
                'Run Quick Test'
              )}
            </Button>
            
            {quickTest && (
              <div className="mt-4 p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  {getTestIcon(quickTest.success)}
                  <span className="font-medium">{quickTest.message}</span>
                  {getTestBadge(quickTest.success)}
                </div>
                {quickTest.data && (
                  <div className="text-sm text-muted-foreground">
                    <div>Users: {quickTest.data.usersCount}</div>
                    <div>Notifications: {quickTest.data.notificationsCount}</div>
                  </div>
                )}
                {quickTest.error && (
                  <div className="text-sm text-red-500 mt-1">
                    Error: {quickTest.error}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Complete Test Suite
            </CardTitle>
            <CardDescription>
              Comprehensive testing of entire notification system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runFullTest} 
              disabled={isRunning}
              className="w-full"
              variant="outline"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Full Test Suite...
                </>
              ) : (
                'Run Complete Test Suite'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {testReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Test Results
            </CardTitle>
            <CardDescription>
              Complete notification system test results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">{testReport.summary.total}</div>
                <div className="text-sm text-blue-600">Total Tests</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">{testReport.summary.passed}</div>
                <div className="text-sm text-green-600">Passed</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50">
                <div className="text-2xl font-bold text-red-600">{testReport.summary.failed}</div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-50">
                <div className="text-2xl font-bold text-purple-600">{testReport.summary.successRate}%</div>
                <div className="text-sm text-purple-600">Success Rate</div>
              </div>
            </div>

            {/* Individual Test Results */}
            <div className="space-y-3">
              {testReport.results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {getTestIcon(result.success)}
                    <div>
                      <div className="font-medium">{testReport.results[index] ? Object.keys({})[index] : `Test ${index + 1}`}</div>
                      <div className="text-sm text-muted-foreground">{result.message}</div>
                      {result.error && (
                        <div className="text-sm text-red-500 mt-1">Error: {result.error}</div>
                      )}
                    </div>
                  </div>
                  {getTestBadge(result.success)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            What This Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Quick Test Checks:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Database connection</li>
                <li>• Available users</li>
                <li>• Existing notifications</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Complete Test Suite Checks:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Database connection</li>
                <li>• User availability by role</li>
                <li>• Case participant assignments</li>
                <li>• Test case creation</li>
                <li>• Real notification sending</li>
                <li>• Database verification</li>
                <li>• Real-time subscriptions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
