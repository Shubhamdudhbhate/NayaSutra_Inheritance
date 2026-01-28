import { X, FileText, Gavel, Users, CheckCircle, Clock, AlertCircle, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWeb3 } from "@/contexts/Web3Context";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  requires_confirmation?: boolean;
  user_id: string;
  type?: string;
  metadata?: any;
  signature?: string | null;
}

interface NotificationDetailModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onSign: (notification: Notification) => Promise<void>;
  isSigning: boolean;
  sessionStatus?: 'pending' | 'in_progress' | 'final_submission';
  signingStatus?: Array<{
    userId: string;
    userName: string;
    role: string;
    signed: boolean;
    signedAt?: string;
  }>;
  isJudge?: boolean; // New prop to identify if this is for judge
  allPartiesSigned?: boolean; // New prop to track if all parties have signed
}

export const NotificationDetailModal = ({ 
  notification, 
  isOpen, 
  onClose, 
  onSign, 
  isSigning,
  sessionStatus = 'pending',
  signingStatus = [],
  isJudge = false,
  allPartiesSigned = false
}: NotificationDetailModalProps) => {
  const { isConnected } = useWeb3();

  if (!notification || !isOpen) return null;

  const hasSigned = notification.is_read;
  const showSignButton = !notification.is_read || notification.type === 'session_ended';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'final_submission': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <AlertCircle className="w-4 h-4" />;
      case 'final_submission': return <Gavel className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-hidden">
      <div className="w-full max-w-5xl max-h-[95vh] bg-gradient-to-br from-slate-900/98 to-slate-800/98 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl overflow-hidden flex flex-col">
        <CardHeader className="border-b border-white/10 flex-shrink-0 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getStatusColor(sessionStatus)}`}>
                {getStatusIcon(sessionStatus)}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl text-white truncate">{notification.title}</CardTitle>
                <CardDescription className="text-slate-400 truncate">
                  {notification.metadata?.caseNumber && `Case: ${notification.metadata.caseNumber}`}
                  {notification.metadata?.sessionId && ` • Session: ${notification.metadata.sessionId}`}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 flex-shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <Tabs defaultValue="details" className="w-full h-full flex flex-col">
            <TabsList className={`grid w-full ${isJudge ? 'grid-cols-5' : 'grid-cols-4'} bg-white/5 border border-white/10 mx-6 mt-4 mb-2`}>
              <TabsTrigger value="details" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 text-xs px-2 py-2">Session Details</TabsTrigger>
              <TabsTrigger value="verdict" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 text-xs px-2 py-2">Judge's Verdict</TabsTrigger>
              <TabsTrigger value="proofs" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 text-xs px-2 py-2">Evidence</TabsTrigger>
              <TabsTrigger value="transcript" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 text-xs px-2 py-2">Transcript</TabsTrigger>
              {isJudge && (
                <TabsTrigger value="signing-status" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 text-xs px-2 py-2">
                  Signing Status
                  {!allPartiesSigned && (
                    <span className="ml-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-400">Case ID</h4>
                    <p className="text-sm text-slate-200">{notification.metadata?.caseId || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-400">Session ID</h4>
                    <p className="text-sm text-slate-200">{notification.metadata?.sessionId || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-400">Session Date</h4>
                    <p className="text-sm text-slate-200">
                      {notification.created_at ? new Date(notification.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-400">Status</h4>
                    <Badge className={getStatusColor(sessionStatus)}>
                      {sessionStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-slate-400 mb-2">Session Summary</h4>
                  <p className="text-sm text-slate-300">{notification.message}</p>
                </div>

                {notification.metadata?.notes && (
                  <div>
                    <h4 className="font-semibold text-sm text-slate-400 mb-2">Additional Notes</h4>
                    <p className="text-sm text-slate-300">{notification.metadata.notes}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="verdict" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                  <Gavel className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Judge's Verdict</h3>
                </div>
                
                {notification.metadata?.verdict ? (
                  <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                      {notification.metadata.verdict}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Gavel className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Verdict not yet available</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="proofs" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Evidence Submitted</h3>
                </div>
                
                {notification.metadata?.evidence && notification.metadata.evidence.length > 0 ? (
                  <div className="grid gap-3">
                    {notification.metadata.evidence.map((proof: any, index: number) => (
                      <div key={index} className="border border-white/10 rounded-lg p-3 bg-white/5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm text-white">{proof.title || `Evidence ${index + 1}`}</h4>
                          <Badge variant="outline" className="border-blue-500/50 text-blue-400">{proof.type || 'Document'}</Badge>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{proof.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No evidence submitted for this session</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="transcript" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                  <FileText className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Session Transcript</h3>
                </div>
                
                <div className="h-64 w-full border border-white/10 rounded-lg p-4 bg-white/5 overflow-y-auto">
                  {notification.metadata?.transcript ? (
                    <div className="text-sm text-slate-300 whitespace-pre-wrap">
                      {notification.metadata.transcript}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Transcript not yet available</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Judge-specific Signing Status Tab */}
            {isJudge && (
              <TabsContent value="signing-status" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-semibold text-white">Party Signing Status</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Overall Status:</span>
                      <Badge className={allPartiesSigned ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'}>
                        {allPartiesSigned ? 'All Signed' : `${signingStatus.filter(s => s.signed).length}/${signingStatus.length} Signed`}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {signingStatus.map((signer, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${signer.signed ? 'bg-green-500' : 'bg-orange-500'} ${!signer.signed && 'animate-pulse'}`} />
                          <div>
                            <p className="font-medium text-sm text-white">{signer.userName}</p>
                            <p className="text-xs text-slate-400">{signer.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {signer.signed ? (
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1 text-green-400">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">Signed</span>
                              </div>
                              {signer.signedAt && (
                                <span className="text-xs text-slate-500 mt-1">
                                  {new Date(signer.signedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-orange-400">
                              <Clock className="w-4 h-4" />
                              <span className="text-xs font-medium">Pending</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!allPartiesSigned && (
                    <div className="mt-6 p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-400" />
                        <p className="text-sm text-orange-300">
                          Waiting for all parties to sign before you can finalize the session.
                        </p>
                      </div>
                    </div>
                  )}

                  {allPartiesSigned && (
                    <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <p className="text-sm text-green-300">
                          All parties have signed. You can now sign to finalize the session.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>

        {/* Action Buttons */}
        <div className="border-t border-white/10 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between">
            <div className="text-sm text-slate-400">
              {hasSigned && (
                <div className="flex items-center gap-1 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Signed on {new Date(notification.confirmed_at || '').toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white">
                Close
              </Button>
              
              {showSignButton && !hasSigned && (
                <Button 
                  onClick={() => onSign(notification)}
                  disabled={isSigning || !isConnected || (isJudge && !allPartiesSigned)}
                  className={`font-semibold px-6 py-2 shadow-lg ${
                    isJudge && !allPartiesSigned 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                  }`}
                >
                  {isSigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <PenTool className="w-4 h-4 mr-2" />
                      {isJudge ? 'Finalize Session' : 'Sign with MetaMask'}
                    </>
                  )}
                </Button>
              )}
              
              {hasSigned && (
                <Button 
                  disabled
                  className="bg-green-600 text-white font-semibold px-6 py-2 cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isJudge ? 'Session Finalized' : 'Already Signed'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
