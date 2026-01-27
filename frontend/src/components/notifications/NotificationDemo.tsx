import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmationNotification } from './ConfirmationNotification';
import { JudgeBlockchainSigning } from './JudgeBlockchainSigning';
import { Bell, CheckCircle, Users, Shield } from 'lucide-react';

export const NotificationDemo = () => {
  const [currentStep, setCurrentStep] = useState<'idle' | 'notifications' | 'confirmations' | 'signing' | 'complete'>('idle');
  const [confirmedCount, setConfirmedCount] = useState(0);

  const mockNotification = {
    id: 'notif-123',
    title: 'Session Confirmation Required - CASE-2024-001',
    message: 'Court session for case CASE-2024-001 has ended. Please confirm to proceed with blockchain recording.',
    caseNumber: 'CASE-2024-001',
    sessionId: 'session-abc-123'
  };

  const handleDemo = () => {
    setCurrentStep('notifications');
    
    // Simulate sending notifications
    setTimeout(() => {
      setCurrentStep('confirmations');
    }, 2000);
  };

  const handleConfirm = () => {
    setConfirmedCount(prev => prev + 1);
    
    // After all participants confirm (mock: 3 participants)
    if (confirmedCount + 1 >= 3) {
      setTimeout(() => {
        setCurrentStep('signing');
      }, 1000);
    }
  };

  const handleSigned = () => {
    setCurrentStep('complete');
  };

  const resetDemo = () => {
    setCurrentStep('idle');
    setConfirmedCount(0);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Session End Notification Flow Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  currentStep === 'idle' ? 'bg-gray-400' :
                  currentStep === 'notifications' ? 'bg-yellow-400' :
                  currentStep === 'confirmations' ? 'bg-blue-400' :
                  currentStep === 'signing' ? 'bg-purple-400' :
                  'bg-green-400'
                }`} />
                <span className="font-medium">
                  {currentStep === 'idle' && 'Ready to Start'}
                  {currentStep === 'notifications' && 'Sending Notifications...'}
                  {currentStep === 'confirmations' && `Waiting for Confirmations (${confirmedCount}/3)`}
                  {currentStep === 'signing' && 'Judge Signing on Blockchain'}
                  {currentStep === 'complete' && '✅ Complete'}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={resetDemo}>
                Reset
              </Button>
            </div>

            {/* Demo Controls */}
            {currentStep === 'idle' && (
              <div className="text-center py-8">
                <Button onClick={handleDemo} size="lg" className="bg-primary">
                  <Users className="h-4 w-4 mr-2" />
                  Start Session End Demo
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Simulates judge ending a session and sending notifications to participants
                </p>
              </div>
            )}

            {/* Step 1: Notifications Sent */}
            {currentStep === 'notifications' && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                    <Bell className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Sending notifications to participants...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Participant Confirmations */}
            {currentStep === 'confirmations' && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participant Confirmations ({confirmedCount}/3)
                </h3>
                
                {/* Show confirmation notifications */}
                {[1, 2, 3].map((participant) => (
                  <ConfirmationNotification
                    key={participant}
                    notification={mockNotification}
                    onConfirm={handleConfirm}
                  />
                ))}
              </div>
            )}

            {/* Step 3: Judge Blockchain Signing */}
            {currentStep === 'signing' && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">All participants confirmed!</span>
                  </div>
                </div>
                
                <JudgeBlockchainSigning
                  sessionId={mockNotification.sessionId}
                  caseNumber={mockNotification.caseNumber}
                  onSigned={handleSigned}
                />
              </div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 'complete' && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Shield className="h-6 w-6 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium text-green-800 dark:text-green-200">
                      Session End Recorded on Blockchain
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      All participants confirmed and judge signed successfully
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
