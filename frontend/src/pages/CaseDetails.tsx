import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  File,
  FileText,
  FileText as FileTextIcon,
  Play,
  Save,
  Shield,
  Square,
  Upload,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Printer,
  Download,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCourtSession } from "@/hooks/useCourtSession";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { createSessionEndNotifications } from "@/services/notificationServiceDatabase";
import { NotificationDetailModal } from "@/components/notifications/NotificationDetailModal";
import { useWeb3 } from "@/contexts/Web3Context";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReviewVault } from "@/components/dashboard/judge/ReviewVault";
import { EvidenceList } from "@/components/cases/EvidenceList";
import { ScheduleHearingDialog } from "@/components/ScheduleHearingDialog";

// --- NEW IMPORTS ---
import { EvidenceUploader } from "@/components/cases/EvidenceUploader";
import { EvidenceVault } from "@/components/cases/EvidenceVault";

// Match the actual database schema for cases table
type DbCase = {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  case_type: string;
  party_a_name: string;
  party_b_name: string;
  court_name: string | null;
  clerk_id?: string | null;
  assigned_judge_id: string | null;
  lawyer_party_a_id: string | null;
  lawyer_party_b_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  unique_identifier?: string;
};

const CaseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { isConnected, connect, signMessage } = useWeb3();

  // Court session management
  const courtSession = useCourtSession(id || "");
  const [caseData, setCaseData] = useState<DbCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [judgeName, setJudgeName] = useState<string | null>(null);
  const [lawyerAName, setLawyerAName] = useState<string | null>(null);
  const [lawyerBName, setLawyerBName] = useState<string | null>(null);

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // Session notes state
  const [sessionNotes, setSessionNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [lastSavedNotes, setLastSavedNotes] = useState<Date | null>(null);
  const [hasNotesChanges, setHasNotesChanges] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);

  const handleSaveNotes = async () => {
    if (!sessionNotes.trim()) {
      setHasNotesChanges(false);
      return;
    }

    setIsSavingNotes(true);
    try {
      const success = await courtSession.updateNotes(sessionNotes);
      if (success) {
        setLastSavedNotes(new Date());
        setHasNotesChanges(false);
        // Only show toast for manual saves
        if (!isSavingNotes) {
          toast.success("Session notes saved");
        }
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      if (!isSavingNotes) {
        toast.error("Failed to save notes");
      }
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCloseSession = async () => {
    if (!profile || !selectedNotification) return;

    const sessionId = selectedNotification.metadata?.sessionId;
    if (!sessionId) {
      toast.error('Session ID not found');
      return;
    }

    setIsClosingSession(true);
    try {
      const now = new Date().toISOString();

      const { error: sessionError } = await supabase
        .from('session_logs')
        .update({
          status: 'ended',
          ended_at: now,
          updated_at: now,
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      toast.success('Session closed successfully');
      setSessionEnded(false);
      await courtSession.refreshSession();
      setShowJudgeModal(false);
    } catch (error) {
      console.error('Error closing session:', error);
      toast.error('Failed to close session');
    } finally {
      setIsClosingSession(false);
    }
  };

  const [isSchedulingSession, setIsSchedulingSession] = useState(false);
  const [isEndingCase, setIsEndingCase] = useState(false);

  const handleScheduleSessionFromModal = async () => {
    setIsSchedulingSession(true);
    try {
      setScheduleDialogOpen(true);
    } catch (error) {
      console.error('Error preparing session scheduling:', error);
      toast.error('Failed to prepare scheduling');
    } finally {
      setIsSchedulingSession(false);
    }
  };

  const handleEndCaseFromModal = async () => {
    if (!caseData?.id) {
      toast.error('Case ID not found');
      return;
    }

    setIsEndingCase(true);
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('cases')
        .update({
          status: 'closed',
          updated_at: now,
        })
        .eq('id', caseData.id);

      if (error) throw error;

      toast.success('Case ended');
      setCaseData(prev => (prev ? { ...prev, status: 'closed', updated_at: now } : prev));
    } catch (error) {
      console.error('Error ending case from modal:', error);
      toast.error('Failed to end case');
    } finally {
      setIsEndingCase(false);
    }
  };

  // Judge modal state
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<{
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
  } | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [signingStatus, setSigningStatus] = useState<any[]>([]);
  const [allPartiesSigned, setAllPartiesSigned] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false); // Track if session has ended

  const refreshSigningStatus = async (sessionId: string) => {
    if (!caseData) return;

    const { data: participants, error } = await supabase
      .from('notifications')
      .select('user_id, signature, confirmed_at')
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error refreshing signing status:', error);
      return;
    }

    const updatedStatus = [
      { userId: caseData.clerk_id, userName: "Clerk", role: "Clerk" },
      { userId: caseData.lawyer_party_a_id, userName: lawyerAName || "Lawyer A", role: "Lawyer (Plaintiff)" },
      { userId: caseData.lawyer_party_b_id, userName: lawyerBName || "Lawyer B", role: "Lawyer (Defendant)" },
    ]
      .filter(p => p.userId)
      .map(participant => {
        const record = participants?.find(p => p.user_id === participant.userId);
        return {
          ...participant,
          signed: !!record?.signature,
          signedAt: record?.confirmed_at,
        };
      });

    setSigningStatus(updatedStatus);
    setAllPartiesSigned(updatedStatus.every(s => s.signed));
  };

  // Realtime: whenever any notification for this session updates, refresh full signing list from DB
  useEffect(() => {
    const sessionId = selectedNotification?.metadata?.sessionId;
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-signatures-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          refreshSigningStatus(sessionId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedNotification?.metadata?.sessionId, caseData, lawyerAName, lawyerBName]);

  // Check for existing ended session on component mount
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!caseData || !profile) return;
      
      try {
        // 1. First check for paused sessions in session_logs
        const { data: pausedSessions } = await supabase
          .from('session_logs')
          .select('*')
          .eq('case_id', caseData.id)
          .eq('status', 'paused')
          .order('created_at', { ascending: false })
          .limit(1);

        if (pausedSessions && pausedSessions.length > 0) {
          const pausedSession = pausedSessions[0];
          console.log('📋 Found paused session:', pausedSession.id);
          
          // 2. Check for notifications related to this paused session
          const { data: notifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('case_id', caseData.id)
            .eq('session_id', pausedSession.id)
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (notifications && notifications.length > 0) {
            const notification = notifications[0];
            
            // Set session as ended and create judge notification object
            setSessionEnded(true);
            
            const judgeNotification = {
              id: notification.id,
              title: notification.title,
              message: notification.message,
              type: (notification as any).type || 'session_ended',
              is_read: notification.is_read ?? false,
              created_at: notification.created_at || new Date().toISOString(),
              confirmed_at: notification.confirmed_at,
              confirmed_by: notification.confirmed_by,
              requires_confirmation: (notification as any).requires_confirmation ?? undefined,
              user_id: notification.user_id,
              metadata: {
                ...(((notification.metadata && typeof notification.metadata === 'object') ? notification.metadata : {}) as any),
                caseId: (notification.metadata as any)?.caseId || notification.case_id || caseData.id,
                sessionId: (notification.metadata as any)?.sessionId || notification.session_id || pausedSession.id,
              },
              signature: notification.signature
            };

            // Initialize signing status (clerk + 2 lawyers)
            const initialSigningStatus = [
              { userId: caseData.clerk_id, userName: "Clerk", role: "Clerk", signed: false },
              { userId: caseData.lawyer_party_a_id, userName: lawyerAName || "Lawyer A", role: "Lawyer (Plaintiff)", signed: false },
              { userId: caseData.lawyer_party_b_id, userName: lawyerBName || "Lawyer B", role: "Lawyer (Defendant)", signed: false }
            ].filter(person => person.userId);

            setSelectedNotification(judgeNotification);
            setSigningStatus(initialSigningStatus);
            
            // Check if all parties have signed
            const allSigned = initialSigningStatus.every(signer => signer.signed);
            setAllPartiesSigned(allSigned);
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
      }
    };

    checkExistingSession();
  }, [caseData, profile, lawyerAName, lawyerBName]);

  // Auto-save effect for notes
  useEffect(() => {
    if (!hasNotesChanges || !courtSession.isSessionActive) return;

    const timer = setTimeout(() => {
      handleSaveNotes();
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionNotes, hasNotesChanges, courtSession.isSessionActive]);

  // Session duration timer
  useEffect(() => {
    if (!courtSession.isSessionActive) {
      setSessionDuration(0);
      return;
    }

    const interval = setInterval(() => {
      if (courtSession.activeSession?.started_at) {
        const duration = Math.floor(
          (Date.now() -
            new Date(courtSession.activeSession.started_at).getTime()) / 1000,
        );
        setSessionDuration(duration);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [courtSession.isSessionActive, courtSession.activeSession?.started_at]);

  const formatSessionDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const fetchData = async () => {
    if (!id) return;

    try {
      // Fetch case data
      const { data: caseResult, error: caseError } = await supabase
        .from("cases")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (caseError) {
        console.error("Error fetching case:", caseError);
        toast.error("Failed to load case");
        return;
      }

      if (!caseResult) {
        toast.error("Case not found");
        return;
      }

      setCaseData(caseResult);

      // Fetch judge name if assigned
      if (caseResult.assigned_judge_id) {
        const { data: judgeProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", caseResult.assigned_judge_id)
          .maybeSingle();

        if (judgeProfile) {
          setJudgeName(judgeProfile.full_name);
        }
      }

      // Fetch lawyer names if assigned
      if (caseResult.lawyer_party_a_id) {
        const { data: lawyerAProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", caseResult.lawyer_party_a_id)
          .maybeSingle();

        if (lawyerAProfile) {
          setLawyerAName(lawyerAProfile.full_name);
        }
      }

      if (caseResult.lawyer_party_b_id) {
        const { data: lawyerBProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", caseResult.lawyer_party_b_id)
          .maybeSingle();

        if (lawyerBProfile) {
          setLawyerBName(lawyerBProfile.full_name);
        }
      }
    } catch (error) {
      console.error("Error loading case:", error);
      toast.error("Failed to load case data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const isJudge = profile?.role_category === "judiciary" || profile?.role_category === "judge";
  // const isClerk = profile?.role_category === "clerk"; // Unused now
  const isLawyer = profile?.role_category === "lawyer";

  // Determine default tab based on URL params and user role
  const getDefaultTab = () => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "upload" && isLawyer) return "upload";
    if (tabParam === "notes" && isJudge && courtSession.isSessionActive) return "notes";
    if (tabParam === "evidence") return "evidence";
    return "overview";
  };
  const isCriminal = caseData?.case_type === "criminal";

  const handleStartSession = async () => {
    const session = await courtSession.startSession();
    if (session) {
      setSessionNotes("");
      toast.success(
        "Court session started. You can now take notes and manage evidence.",
      );
    }
  };

  const handleEndSession = async () => {
    if (!courtSession.isSessionActive || !profile || !caseData) return;

    const confirmed = window.confirm(
      "End the court session? This will:\n\n1. Send notifications to all case participants (clerk + lawyers)\n2. Request confirmations from all participants\n3. Enable blockchain signing after all confirmations\n\nContinue?",
    );
    if (confirmed) {
      try {
        // 1. Update session_logs to set status to 'paused'
        if (courtSession.activeSession?.id) {
          const { error: sessionError } = await supabase
            .from('session_logs')
            .update({
              status: 'paused',
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', courtSession.activeSession.id);

          if (sessionError) {
            console.error('Error updating session status:', sessionError);
            toast.error("Failed to update session status");
            return;
          }

          console.log('✅ Session status updated to paused:', courtSession.activeSession.id);
        }

        // 2. Create notifications for all participants
        const success = await createSessionEndNotifications({
          caseId: caseData.id,
          sessionId: courtSession.activeSession?.id || '',
          judgeId: profile.id,
          caseNumber: caseData.case_number || 'Unknown',
          endedAt: new Date().toISOString(),
          notes: sessionNotes || undefined
        });

        if (success) {
          // Create judge notification object for modal
          const judgeNotification = {
            id: 'judge-notification-' + Date.now(),
            title: `Session Ended - ${caseData.case_number}`,
            message: `Court session has ended. All parties need to sign to confirm.`,
            type: 'session_ended',
            is_read: false,
            created_at: new Date().toISOString(),
            requires_confirmation: true,
            caseId: caseData.id,
            sessionId: courtSession.activeSession?.id || '',
            user_id: profile.id,
            metadata: {
              sessionId: courtSession.activeSession?.id || '',
              caseNumber: caseData.case_number,
              endedAt: new Date().toISOString(),
              notes: sessionNotes || undefined,
              judgeId: profile.id
            }
          };

          // Initialize signing status for judge modal (clerk + 2 lawyers)
          const initialSigningStatus = [
            { userId: caseData.clerk_id, userName:   "Clerk", role: "Clerk", signed: false },
            { userId: caseData.lawyer_party_a_id, userName: lawyerAName || "Lawyer A", role: "Lawyer (Plaintiff)", signed: false },
            { userId: caseData.lawyer_party_b_id, userName: lawyerBName || "Lawyer B", role: "Lawyer (Defendant)", signed: false }
          ].filter(person => person.userId); // Filter out null values

          setSelectedNotification(judgeNotification);
          setSigningStatus(initialSigningStatus);
          setAllPartiesSigned(false);
          setShowJudgeModal(true);
          setSessionEnded(true); // Mark session as ended

          // Ensure UI immediately reflects that the session is no longer active,
          // so the Sign Status button condition (sessionEnded && !isSessionActive) becomes true.
          await courtSession.refreshSession();
          
          toast.success("Session ended! Review details and monitor signing progress.", {
            duration: 5000,
            description: `Case: ${caseData.case_number} | Session paused and notifications sent.`
          });
        } else {
          toast.error("Session ended but notification failed");
        }
      } catch (error) {
        console.error('Error ending session:', error);
        toast.error("Failed to end session");
      }
    }
  };

  const handleJudgeSign = async (_notification?: any) => {
    if (!profile || !selectedNotification) return;

    const sessionId = selectedNotification.metadata?.sessionId;
    if (!sessionId) {
      toast.error('Session ID not found');
      return;
    }
    
    // Check if all 3 parties (clerk + 2 lawyers) have signed
    if (!allPartiesSigned) {
      toast.error("Please wait for all parties (clerk and both lawyers) to sign first.");
      return;
    }
    
    setIsSigning(true);
    try {
      if (!isConnected) {
        await connect();
      }

      const caseId = selectedNotification.metadata?.caseId;
      const confirmedAt = new Date().toISOString();

      const message = [
        'NyaySutra Court Session Finalization (Judge Signature)',
        `caseId: ${caseId || 'N/A'}`,
        `sessionId: ${sessionId}`,
        `judgeUserId: ${profile.id}`,
        `timestamp: ${confirmedAt}`,
      ].join('\n');

      const signature = await signMessage(message);
      if (!signature) {
        toast.error('Signature was not collected from MetaMask');
        return;
      }

      // Persist judge signature on the judge's OWN notification row for this session
      const { error } = await supabase
        .from('notifications')
        .update({
          signature,
          confirmed_at: confirmedAt,
          confirmed_by: profile.id,
          is_read: true,
        })
        .eq('session_id', sessionId)
        .eq('user_id', profile.id);

      if (error) throw error;

      setSelectedNotification(prev => prev ? {
        ...prev,
        signature,
        confirmed_at: confirmedAt,
        confirmed_by: profile.id,
        is_read: true,
      } : null);

      toast.success('Judge signed successfully!');

      // Refresh status so reopening shows correct values
      await refreshSigningStatus(sessionId);
    } catch (error) {
      console.error('Error signing:', error);
      toast.error('Failed to persist judge signature');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSignStatusClick = async () => {
    if (!caseData || !profile) return;
    
    // If we already have the notification, show the modal
    if (selectedNotification) {
      const sessionId = selectedNotification.metadata?.sessionId;
      if (sessionId) {
        await refreshSigningStatus(sessionId);
      }
      setShowJudgeModal(true);
      return;
    }
    
    // Otherwise, fetch the latest session notification
    try {

      console.log("Searching for notification with:", {
        caseId: caseData.id,
        userId: profile.id
      });
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('case_id', caseData.id)
        .not('session_id', 'is', null)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (notifications && notifications.length > 0) {
        const notification = notifications[0];
        
        // Create judge notification object
        const judgeNotification = {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: (notification as any).type || 'session_ended',
          is_read: notification.is_read ?? false,
          created_at: notification.created_at || new Date().toISOString(),
          confirmed_at: notification.confirmed_at,
          confirmed_by: notification.confirmed_by,
          requires_confirmation: (notification as any).requires_confirmation ?? undefined,
          user_id: notification.user_id,
          metadata: {
            ...(((notification.metadata && typeof notification.metadata === 'object') ? notification.metadata : {}) as any),
            caseId: (notification.metadata as any)?.caseId || notification.case_id || caseData.id,
            sessionId: (notification.metadata as any)?.sessionId || notification.session_id,
          },
          signature: notification.signature
        };

        // Initialize signing status (clerk + 2 lawyers)
        const initialSigningStatus = [
          { userId: caseData.clerk_id, userName: "Clerk", role: "Clerk", signed: false },
          { userId: caseData.lawyer_party_a_id, userName: lawyerAName || "Lawyer A", role: "Lawyer (Plaintiff)", signed: false },
          { userId: caseData.lawyer_party_b_id, userName: lawyerBName || "Lawyer B", role: "Lawyer (Defendant)", signed: false }
        ].filter(person => person.userId);

        setSelectedNotification(judgeNotification);
        setSigningStatus(initialSigningStatus);
        
        // Check if all parties have signed
        const allSigned = initialSigningStatus.every(signer => signer.signed);
        setAllPartiesSigned(allSigned);

        const sessionId = (judgeNotification as any)?.metadata?.sessionId;
        if (sessionId) {
          await refreshSigningStatus(sessionId);
        }
        
        setShowJudgeModal(true);
      } else {
        toast.error("No session data found. Please end a session first.");
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast.error("Failed to load session data");
    }
  };

  const handleEvidenceUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!courtSession.isSessionActive) {
      toast.error("No active session. Start a court session first.");
      return;
    }

    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    if (!courtSession.canUpload && !isJudge) {
      toast.error(
        "You don't have permission to upload evidence in this session",
      );
      return;
    }

    // Validate file types
    const allowedTypes = [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "jpg",
      "jpeg",
      "png",
      "mp4",
      "mp3",
      "wav",
    ];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        toast.error(`File type not supported: ${file.name}`);
        return;
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error(`File too large: ${file.name} (Max 100MB)`);
        return;
      }

      // Mock file upload - in production, this would upload to storage
      toast.success(`✅ Evidence file "${file.name}" uploaded successfully`);
    }

    // Reset file input
    e.currentTarget.value = "";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Case not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "closed":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "hearing":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "verdict_pending":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(0,0%,4%)] flex flex-col">
      {/* Simple Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <code className="text-sm font-mono text-muted-foreground">
              {caseData.case_number}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isJudge && caseData.status !== 'closed' && !courtSession.isSessionActive && !sessionEnded && (
            <>
              <Button
                onClick={handleStartSession}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Court Session
              </Button>
            </>
          )}
          {isJudge && caseData.status !== 'closed' && sessionEnded && !courtSession.isSessionActive && (
            <>
              <Button
                onClick={handleSignStatusClick}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium"
              >
                <Users className="w-4 h-4 mr-2" />
                Sign Status ({signingStatus.filter(s => s.signed).length}/{signingStatus.length})
              </Button>
            </>
          )}
          {isJudge && caseData.status !== 'closed' && courtSession.isSessionActive && !sessionEnded && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium text-emerald-400">
                  Active
                </span>
                <span className="text-xs text-emerald-400/70 ml-1">
                  ({formatSessionDuration(sessionDuration)})
                </span>
              </div>
              <Button
                onClick={handleEndSession}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium"
                title="End session and send notifications to all participants"
              >
                <Square className="w-4 h-4 mr-2" />
                End Session & Send Notifications
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Case Overview Card */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{caseData.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {caseData.unique_identifier}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={getStatusColor(caseData.status)}
                >
                  {caseData.status.charAt(0).toUpperCase() +
                    caseData.status.slice(1).replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {caseData.description && (
                <p className="text-muted-foreground">{caseData.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Case Type</p>
                  <p className="font-medium capitalize">{caseData.case_type}</p>
                </div>
                {caseData.court_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Court</p>
                    <p className="font-medium">{caseData.court_name}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Parties Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Parties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {isCriminal ? "Complainant" : "Plaintiff"}
                  </p>
                  <p className="font-medium">{caseData.party_a_name}</p>
                  {lawyerAName && (
                    <p className="text-sm text-muted-foreground">
                      Lawyer:{" "}
                      <span className="text-foreground">{lawyerAName}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {isCriminal ? "Accused" : "Defendant"}
                  </p>
                  <p className="font-medium">{caseData.party_b_name}</p>
                  {lawyerBName && (
                    <p className="text-sm text-muted-foreground">
                      Lawyer:{" "}
                      <span className="text-foreground">{lawyerBName}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Judge Card */}
          {judgeName && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Assigned Judge</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{judgeName}</p>
              </CardContent>
            </Card>
          )}

          {/* Tabs with Evidence, Notes, and Overview */}
          <Tabs defaultValue={getDefaultTab()} className="space-y-4">
            <TabsList className="bg-card border border-border">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-secondary"
              >
                Overview
              </TabsTrigger>
              {isJudge && (
                <TabsTrigger
                  value="review"
                  className="data-[state=active]:bg-secondary"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Review Vault
                </TabsTrigger>
              )}
              <TabsTrigger
                value="evidence"
                className="data-[state=active]:bg-secondary"
              >
                <Shield className="w-4 h-4 mr-2" />
                Evidence Vault
              </TabsTrigger>
              {isLawyer && (
                <TabsTrigger
                  value="upload"
                  className="data-[state=active]:bg-secondary"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Evidence
                </TabsTrigger>
              )}
              {courtSession.isSessionActive && isJudge && (
                <TabsTrigger
                  value="notes"
                  className="data-[state=active]:bg-secondary"
                >
                  <FileTextIcon className="w-4 h-4 mr-2" />
                  Session Notes
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <Card className="border-border/50">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Case overview and timeline will be displayed here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {isJudge && (
              <TabsContent value="review">
                <Card className="border-border/50 bg-gray-900/20">
                  <CardContent className="p-4">
                    <ReviewVault caseId={id || ""} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="evidence">
              {/* --- REAL EVIDENCE VAULT INTEGRATION --- */}
              <Card className="border-border/50 bg-gray-900/20">
                <CardContent className="p-4">
                  <EvidenceList 
                    caseId={id || ""} 
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {isLawyer && (
              <TabsContent value="upload">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                   {/* --- REAL EVIDENCE UPLOADER INTEGRATION --- */}
                   <EvidenceUploader 
                      caseId={id || ""} 
                      uploaderUuid={profile.id} 
                      // uploaderRole={'LAWYER'} 
                      onUploadComplete={() => {
                        toast.success("List refreshed");
                        // You could trigger a re-fetch of the vault here if they share state
                      }}
                   />
                </motion.div>
              </TabsContent>
            )}

            {courtSession.isSessionActive && isJudge && (
              <TabsContent value="notes">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Judge Notes Header */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                            <FileTextIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              Session Notes
                            </CardTitle>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-sm text-muted-foreground">
                                Case: {caseData.case_number}
                              </p>
                              <span className="text-muted-foreground/50">
                                •
                              </span>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Duration: {" "}
                                {formatSessionDuration(sessionDuration)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Save Status */}
                        <div className="flex items-center gap-2">
                          {isSavingNotes
                            ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                Saving...
                              </div>
                            )
                            : hasNotesChanges
                            ? (
                              <div className="flex items-center gap-2 text-xs text-amber-400">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                Unsaved changes
                              </div>
                            )
                            : lastSavedNotes
                            ? (
                              <div className="flex items-center gap-2 text-xs text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Saved
                              </div>
                            )
                            : null}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Rich Editor Card */}
                  <Card className="card-glass border-border/50 shadow-2xl">
                    <CardHeader className="pb-3 border-b border-border/50 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
                      {/* Toolbar */}
                      <div className="flex items-center gap-1 flex-wrap bg-secondary/20 -m-4 p-3 rounded-t-lg border-b border-border/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Undo"
                          onClick={() => {}}
                          className="hover:bg-primary/10 transition-colors"
                        >
                          <Undo className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Redo"
                          onClick={() => {}}
                          className="hover:bg-primary/10 transition-colors"
                        >
                          <Redo className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-1 border-border/50" />
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Bold"
                          onClick={() => document.execCommand('bold')}
                          className="hover:bg-primary/10 transition-colors font-bold"
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Italic"
                          onClick={() => document.execCommand('italic')}
                          className="hover:bg-primary/10 transition-colors italic"
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Underline"
                          onClick={() => document.execCommand('underline')}
                          className="hover:bg-primary/10 transition-colors underline"
                        >
                          <Underline className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-1 border-border/50" />
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Align Left"
                          onClick={() => document.execCommand('justifyLeft')}
                          className="hover:bg-primary/10 transition-colors"
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Align Center"
                          onClick={() => document.execCommand('justifyCenter')}
                          className="hover:bg-primary/10 transition-colors"
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Align Right"
                          onClick={() => document.execCommand('justifyRight')}
                          className="hover:bg-primary/10 transition-colors"
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-1 border-border/50" />
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Bullet List"
                          onClick={() => document.execCommand('insertUnorderedList')}
                          className="hover:bg-primary/10 transition-colors"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Numbered List"
                          onClick={() => document.execCommand('insertOrderedList')}
                          className="hover:bg-primary/10 transition-colors"
                        >
                          <ListOrdered className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-1 border-border/50" />
                        <Select
                          onValueChange={(value) => {
                            if (value === "heading1") document.execCommand('formatBlock', false, 'h1');
                            else if (value === "heading2") document.execCommand('formatBlock', false, 'h2');
                            else if (value === "heading3") document.execCommand('formatBlock', false, 'h3');
                            else document.execCommand('formatBlock', false, 'p');
                          }}
                        >
                          <SelectTrigger className="w-32 h-8 bg-muted/30 border-border/50 hover:bg-muted/50 transition-colors">
                            <SelectValue placeholder="Style" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border/50">
                            <SelectItem value="heading1">Heading 1</SelectItem>
                            <SelectItem value="heading2">Heading 2</SelectItem>
                            <SelectItem value="heading3">Heading 3</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Right side tools */}
                        <div className="ml-auto flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Print Preview"
                            onClick={() => {}}
                            className="hover:bg-primary/10 transition-colors"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Export as PDF"
                            onClick={() => {}}
                            className="hover:bg-primary/10 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Export as DOCX"
                            onClick={() => {}}
                            className="hover:bg-primary/10 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 overflow-y-auto h-[calc(100%-140px)] flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                      <Input
                        placeholder="Enter notes title..."
                        className="text-2xl font-bold mb-6 border-0 border-b-2 border-primary/30 rounded-none px-0 py-2 focus-visible:ring-0 focus:border-primary/50 bg-transparent text-foreground placeholder:text-muted-foreground/50"
                      />
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className="min-h-[calc(100vh-450px)] p-6 text-base leading-relaxed bg-transparent focus-visible:outline-none flex-1 overflow-auto rounded-lg border border-border/30 focus:border-primary/30 transition-colors prose prose-invert max-w-none"
                        style={{
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                          whiteSpace: "pre-wrap",
                          minHeight: "400px",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: `<style>
                            .prose h1 { color: #f8fafc; font-size: 2rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
                            .prose h2 { color: #f1f5f9; font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; }
                            .prose h3 { color: #e2e8f0; font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
                            .prose p { color: #cbd5e1; margin-bottom: 1rem; line-height: 1.75; }
                            .prose ul, .prose ol { color: #cbd5e1; margin-bottom: 1rem; padding-left: 1.5rem; }
                            .prose li { margin-bottom: 0.25rem; }
                            .prose strong { color: #f1f5f9; font-weight: 600; }
                            .prose em { color: #e2e8f0; font-style: italic; }
                            .prose blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; margin: 1rem 0; color: #94a3b8; font-style: italic; }
                          </style>`
                        }}
                      />

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {lastSavedNotes && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Last saved: {" "}
                              {lastSavedNotes.toLocaleTimeString("en-IN")}
                            </span>
                          )}
                          <span className="text-muted-foreground/60">
                            {sessionNotes.length} characters • {" "}
                            {sessionNotes.split(/\s+/).filter((w) => w).length}
                            {" "}
                            words
                          </span>
                        </div>
                        <Button
                          onClick={handleSaveNotes}
                          disabled={isSavingNotes || !hasNotesChanges}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Notes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            )}
          </Tabs>

          {/* Timestamps */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Created: {new Date(caseData.created_at).toLocaleString("en-IN")}
            </span>
            <span>
              Updated: {new Date(caseData.updated_at).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      <ScheduleHearingDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        caseId={id || ""}
        caseNumber={caseData.case_number}
        onSuccess={() => {
          toast.success("Hearing scheduled successfully");
        }}
      />

      {/* Judge Notification Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={showJudgeModal}
        onClose={() => {
          setShowJudgeModal(false);
        }}
        onSign={handleJudgeSign}
        onCloseSession={handleCloseSession}
        onScheduleSession={async () => handleScheduleSessionFromModal()}
        onEndCase={async () => handleEndCaseFromModal()}
        isSigning={isSigning}
        isClosingSession={isClosingSession}
        isSchedulingSession={isSchedulingSession}
        isEndingCase={isEndingCase}
        sessionStatus={(caseData?.status as any) || 'pending'}
        signingStatus={signingStatus}
        isJudge={isJudge}
        allPartiesSigned={allPartiesSigned}
      />
    </div>
  );
};

export default CaseDetails;