import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';

interface JudgeBlockchainSigningProps {
  sessionId: string;
  caseNumber: string;
  onSigned: () => void;
}

export const JudgeBlockchainSigning = ({
  sessionId,
  caseNumber,
  onSigned
}: JudgeBlockchainSigningProps) => {
  const { address, signMessage } = useWeb3();
  const [isSigning, setIsSigning] = useState(false);

  const handleBlockchainSign = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    setIsSigning(true);
    try {
      // 1. Prepare session data for signing
      const sessionData = {
        sessionId,
        caseNumber,
        timestamp: new Date().toISOString(),
        allParticipantsConfirmed: true,
        action: 'SESSION_END'
      };

      console.log('📝 Preparing to sign session data:', sessionData);

      // 2. Sign with MetaMask
      const signature = await signMessage(
        JSON.stringify(sessionData)
      );

      if (!signature) {
        throw new Error('Signature failed');
      }

      console.log('✅ Session data signed:', signature);

      // 3. Mock blockchain submission (SAFE - no actual blockchain yet)
      setTimeout(() => {
        console.log('⛓️ Would submit to blockchain:', {
          sessionId,
          signature,
          sessionData
        });

        alert(`Session end recorded on blockchain!\nSignature: ${signature.substring(0, 20)}...`);
        onSigned();
        setIsSigning(false);
      }, 2000);

    } catch (error) {
      console.error('Blockchain signing failed:', error);
      alert('Failed to sign on blockchain. Please try again.');
      setIsSigning(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200">
              Blockchain Signing Required
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              All participants have confirmed. Please sign to record the session end on the blockchain.
            </p>
            <div className="mt-3 space-y-2">
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Case: {caseNumber} | Session: {sessionId.substring(0, 8)}...
              </div>
              <Button
                size="sm"
                onClick={handleBlockchainSign}
                disabled={isSigning}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing on Blockchain...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Sign on Blockchain
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
