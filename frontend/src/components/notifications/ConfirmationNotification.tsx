import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock } from 'lucide-react';
import { confirmSessionEnd } from '@/services/notificationService';

interface ConfirmationNotificationProps {
  notification: {
    id: string;
    title: string;
    message: string;
    caseNumber: string;
    sessionId: string;
  };
  onConfirm: () => void;
}

export const ConfirmationNotification = ({ 
  notification, 
  onConfirm 
}: ConfirmationNotificationProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const success = await confirmSessionEnd(
        notification.sessionId,
        'current-user-id' // TODO: Get from auth context
      );
      
      if (success) {
        onConfirm();
      }
    } catch (error) {
      console.error('Confirmation failed:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
              {notification.title}
            </h4>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              {notification.message}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isConfirming}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isConfirming ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Session End
                  </>
                )}
              </Button>
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                Case: {notification.caseNumber}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
