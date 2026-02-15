import { useState, useEffect } from "react";
import {
  Briefcase,
  Gavel,
  Upload,
  Check,
  Send,
  Clock,
  Loader2,
  User,
  FileText,
  Eye,
  Mic,
  Scale,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/layout/GlassWrapper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SignatureSection } from "./SignatureSection";
import { IpfsUpload } from "@/components/cases/IpfsUpload";
import { EvidenceList } from "@/components/cases/EvidenceList";
import { EvidenceVault } from "@/components/cases/EvidenceVault";
import { 
  clerkReassignJudge, 
  clerkReassignLawyer, 
  getCaseDetails, 
  getCaseParticipants,
  type CaseDetails,
  type CaseParticipants
} from "@/utils/BlockChain_Interface/clerk";
import { useAuth } from "@/contexts/AuthContext";

type CaseData = {
  id: string;
  case_number: string;
  title: string;
  status: string;
  assigned_judge_id: string | null;
  assigned_clerk_id?: string | null;
  lawyer_party_a_id: string | null;
  lawyer_party_b_id: string | null;
  on_chain_case_id: string;
  assigned_judge?: { full_name: string, wallet_address?: string } | null;
  lawyer_party_a?: { full_name: string, wallet_address?: string } | null;
  lawyer_party_b?: { full_name: string, wallet_address?: string } | null;
};

type Profile = {
  id: string;
  full_name: string;
  role_category: string;
  wallet_address?: string;
};

type ActiveSession = {
  id: string;
  case_id: string;
  judge_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  transcript_cid: string | null;
  judge_verdict_cid: string | null;
};

type UploadType = 'transcript' | 'verdict' | null;

interface CaseManagementPanelProps {
  caseData: CaseData;
  onCaseUpdate?: () => void;
}

export const CaseManagementPanel = ({ caseData, onCaseUpdate }: CaseManagementPanelProps) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("documents");
  const [judges, setJudges] = useState<Profile[]>([]);
  const [lawyers, setLawyers] = useState<Profile[]>([]);
  
  // Active Session State
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  
  // Session Document Upload State
  const [uploadType, setUploadType] = useState<UploadType>(null);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  
  // Selection States
  const [selectedJudge, setSelectedJudge] = useState(caseData.assigned_judge_id || "");
  const [selectedLawyerA, setSelectedLawyerA] = useState(caseData.lawyer_party_a_id || "");
  const [selectedLawyerB, setSelectedLawyerB] = useState(caseData.lawyer_party_b_id || "");
  
  // Loading States for Assignments
  const [isAssigningJudge, setIsAssigningJudge] = useState(false);
  const [isAssigningLawyerA, setIsAssigningLawyerA] = useState(false);
  const [isAssigningLawyerB, setIsAssigningLawyerB] = useState(false);
  
  // Judge reassignment document upload states
  const [isUploadingJudgeDoc, setIsUploadingJudgeDoc] = useState(false);
  const [judgeDocUploaded, setJudgeDocUploaded] = useState(false);
  
  // Signature states (read-only - signatures come from respective dashboards)
  // In a real app, these would be fetched from DB or Blockchain
  const [judgeSignature] = useState<string | null>(null);
  const [lawyerASignature] = useState<string | null>(null);
  const [lawyerBSignature] = useState<string | null>(null);
  
  // IPFS state
  const [isReadyForIPFS, setIsReadyForIPFS] = useState(false);
  const [isSendingToIPFS, setIsSendingToIPFS] = useState(false);
  
  // Blockchain Data States
  const [blockchainCaseDetails, setBlockchainCaseDetails] = useState<CaseDetails | null>(null);
  const [blockchainParticipants, setBlockchainParticipants] = useState<CaseParticipants | null>(null);
  const [isLoadingBlockchain, setIsLoadingBlockchain] = useState(false);

  // 1. Fetch Judges and Lawyers from Supabase
  useEffect(() => {
    const fetchPersonnel = async () => {
      // Fetch Judges
      const { data: judgesData } = await supabase
        .from("profiles")
        .select("id, full_name, role_category, wallet_address")
        .eq("role_category", "judge");
      
      // Fetch Lawyers
      const { data: lawyersData } = await supabase
        .from("profiles")
        .select("id, full_name, role_category, wallet_address")
        .eq("role_category", "lawyer");
      
      setJudges((judgesData || []) as Profile[]);
      setLawyers((lawyersData || []) as Profile[]);
    };
    fetchPersonnel();
  }, []);

  // 2. Fetch Blockchain Data
  useEffect(() => {
    const fetchBlockchainData = async () => {
      if (!caseData.on_chain_case_id) return;
      
      setIsLoadingBlockchain(true);
      try {
        const [details, participants] = await Promise.all([
          getCaseDetails(caseData.on_chain_case_id),
          getCaseParticipants(caseData.on_chain_case_id)
        ]);
        
        setBlockchainCaseDetails(details);
        setBlockchainParticipants(participants);
      } catch (error) {
        console.error("Failed to fetch blockchain data:", error);
        toast.warning("Could not sync with blockchain. Please check your connection.");
      } finally {
        setIsLoadingBlockchain(false);
      }
    };
    
    fetchBlockchainData();
  }, [caseData.on_chain_case_id]);

  // 4. Fetch Active Session for Transcript Upload Enforcement
  useEffect(() => {
    const fetchActiveSession = async () => {
      setIsLoadingSession(true);
      try {
        const { data, error } = await supabase
          .from('session_logs')
          .select('*')
          .eq('case_id', caseData.id)
          .eq('status', 'active')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setActiveSession(data as ActiveSession | null);
      } catch (error) {
        console.error('Error fetching active session:', error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    fetchActiveSession();
    
    // Set up realtime subscription for session changes
    const channel = supabase
      .channel(`session-logs-${caseData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_logs',
          filter: `case_id=eq.${caseData.id}`
        },
        () => {
          fetchActiveSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseData.id]);
  useEffect(() => {
    if (judgeSignature && lawyerASignature && lawyerBSignature) {
      setIsReadyForIPFS(true);
    } else {
      setIsReadyForIPFS(false);
    }
  }, [judgeSignature, lawyerASignature, lawyerBSignature]);

  // --- Handlers ---

  const handleJudgeReassignmentDocumentUpload = async (file: File) => {
    setIsUploadingJudgeDoc(true);
    try {
      const fileName = `judge-reassignment-${caseData.id}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('case-documents')
        .upload(fileName, file);
      
      if (error) throw error;
      
      setJudgeDocUploaded(true);
      toast.success("Document uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload document");
    } finally {
      setIsUploadingJudgeDoc(false);
    }
  };

  const handleReassignJudge = async () => {
    if (!selectedJudge) {
      toast.error("Please select a judge");
      return;
    }
    
    setIsAssigningJudge(true);
    
    try {
      // 1. Blockchain Update (Priority)
      if (caseData.on_chain_case_id) {
        const judgeProfile = judges.find(j => j.id === selectedJudge);
        
        if (judgeProfile?.wallet_address) {
          await clerkReassignJudge(caseData.on_chain_case_id, judgeProfile.wallet_address);
          toast.success("Judge reassigned on Blockchain!");
        } else {
          toast.error("Selected Judge has no wallet address. Cannot reassign on-chain.");
          return; // Stop if blockchain update is impossible
        }
      }

      // 2. Database Update
      const { error } = await supabase
        .from("cases")
        .update({ assigned_judge_id: selectedJudge })
        .eq("id", caseData.id);

      if (error) throw error;
      
      toast.success("Judge updated in Database!");
      onCaseUpdate?.(); // Refresh parent
    } catch (error: any) {
      console.error(error);
      
      // More specific error handling
      if (error.code === "ACTION_REJECTED" || error.message?.includes("user rejected") || error.message?.includes("rejected transaction")) {
        toast.error("Transaction rejected by user. Please approve the transaction in your wallet.");
      } else if (error.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds for gas fees. Please ensure you have enough ETH in your wallet.");
      } else if (error.message?.includes("network")) {
        toast.error("Network error. Please check your internet connection and try again.");
      } else if (error.message?.includes("Invalid") && error.message?.includes("address format")) {
        toast.error("Invalid wallet address format. Please check the wallet addresses in user profiles.");
      } else if (error.message?.includes("Prosecution must be a lawyer")) {
        toast.error("Prosecution lawyer must have a lawyer role in the system. Please select a valid lawyer.");
      } else if (error.message?.includes("Defence must be a lawyer")) {
        toast.error("Defence lawyer must have a lawyer role in the system. Please select a valid lawyer.");
      } else if (error.message?.includes("Judge must be a judge")) {
        toast.error("Selected person must have a judge role in the system. Please select a valid judge.");
      } else if (error.message?.includes("User is not a Lawyer")) {
        toast.error("Selected person is not registered as a lawyer in the system.");
      } else if (error.message?.includes("User is not a Judge")) {
        toast.error("Selected person is not registered as a judge in the system.");
      } else if (error.message?.includes("Invalid role")) {
        toast.error("Invalid role assignment. Please check the role configuration.");
      } else if (error.message?.includes("contract")) {
        toast.error("Smart contract error. Please contact support.");
      } else {
        toast.error(error.message || "Failed to reassign judge");
      }
    } finally {
      setIsAssigningJudge(false);
    }
  };

  const handleReassignLawyerA = async () => {
    if (!selectedLawyerA) return;
    
    setIsAssigningLawyerA(true);
    
    try {
      // 1. Blockchain Update
      if (caseData.on_chain_case_id) {
        const lawyerProfile = lawyers.find(l => l.id === selectedLawyerA);
        
        if (lawyerProfile?.wallet_address) {
          // Role "prosecution" for Party A
          await clerkReassignLawyer(caseData.on_chain_case_id, lawyerProfile.wallet_address, "prosecution");
          toast.success("Lawyer A reassigned on Blockchain!");
        } else {
          toast.error("Selected Lawyer has no wallet address.");
          return;
        }
      }

      // 2. Database Update
      const { error } = await supabase
        .from("cases")
        .update({ lawyer_party_a_id: selectedLawyerA })
        .eq("id", caseData.id);

      if (error) throw error;
      
      toast.success("Lawyer A updated in Database!");
      onCaseUpdate?.();
      
    } catch (error: any) {
      console.error(error);
      
      // More specific error handling
      if (error.code === "ACTION_REJECTED" || error.message?.includes("user rejected") || error.message?.includes("rejected transaction")) {
        toast.error("Transaction rejected by user. Please approve the transaction in your wallet.");
      } else if (error.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds for gas fees. Please ensure you have enough ETH in your wallet.");
      } else if (error.message?.includes("network")) {
        toast.error("Network error. Please check your internet connection and try again.");
      } else if (error.message?.includes("Invalid") && error.message?.includes("address format")) {
        toast.error("Invalid wallet address format. Please check the wallet addresses in user profiles.");
      } else if (error.message?.includes("contract")) {
        toast.error("Smart contract error. Please contact support.");
      } else {
        toast.error(error.message || "Failed to reassign Lawyer A");
      }
    } finally {
      setIsAssigningLawyerA(false);
    }
  };

  const handleReassignLawyerB = async () => {
    if (!selectedLawyerB) return;
    
    setIsAssigningLawyerB(true);
    
    try {
      // 1. Blockchain Update
      if (caseData.on_chain_case_id) {
        const lawyerProfile = lawyers.find(l => l.id === selectedLawyerB);
        
        if (lawyerProfile?.wallet_address) {
          // Role "defence" for Party B
          await clerkReassignLawyer(caseData.on_chain_case_id, lawyerProfile.wallet_address, "defence");
          toast.success("Lawyer B reassigned on Blockchain!");
        } else {
          toast.error("Selected Lawyer has no wallet address.");
          return;
        }
      }

      // 2. Database Update
      const { error } = await supabase
        .from("cases")
        .update({ lawyer_party_b_id: selectedLawyerB })
        .eq("id", caseData.id);

      if (error) throw error;
      
      toast.success("Lawyer B updated in Database!");
      onCaseUpdate?.();
      
    } catch (error: any) {
      console.error(error);
      
      // More specific error handling
      if (error.code === "ACTION_REJECTED" || error.message?.includes("user rejected") || error.message?.includes("rejected transaction")) {
        toast.error("Transaction rejected by user. Please approve the transaction in your wallet.");
      } else if (error.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds for gas fees. Please ensure you have enough ETH in your wallet.");
      } else if (error.message?.includes("network")) {
        toast.error("Network error. Please check your internet connection and try again.");
      } else if (error.message?.includes("Invalid") && error.message?.includes("address format")) {
        toast.error("Invalid wallet address format. Please check the wallet addresses in user profiles.");
      } else if (error.message?.includes("contract")) {
        toast.error("Smart contract error. Please contact support.");
      } else {
        toast.error(error.message || "Failed to reassign Lawyer B");
      }
    } finally {
      setIsAssigningLawyerB(false);
    }
  };

  const handleSendToIPFS = async () => {
    if (!isReadyForIPFS) {
      toast.error("All signatures are required before sending to IPFS");
      return;
    }

    setIsSendingToIPFS(true);
    
    // TODO: Implement actual IPFS upload using Pinata or similar service
    // This is currently a simulation as requested, but structured correctly
    try {
        const ipfsPayload = {
            caseId: caseData.id,
            onChainId: caseData.on_chain_case_id,
            signatures: {
                judge: judgeSignature,
                lawyerA: lawyerASignature,
                lawyerB: lawyerBSignature,
            },
            timestamp: new Date().toISOString(),
        };
        
        console.log("Uploading to IPFS:", ipfsPayload);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        toast.success("Case finalized and uploaded to IPFS!");
    } catch (e) {
        toast.error("IPFS Upload Failed");
    } finally {
        setIsSendingToIPFS(false);
    }
  };

  // --- Session Document Upload Handler ---
  const handleSessionDocUpload = async () => {
    if (!uploadType) {
      toast.error("Please select an upload type (Transcript or Verdict)");
      return;
    }

    if (!selectedDocFile) {
      toast.error("Please select a file to upload");
      return;
    }

    // Enforce: Transcript can only be uploaded when there's an active session
    if (uploadType === 'transcript' && !activeSession) {
      toast.error("Transcript can only be uploaded when there is an active court session");
      return;
    }

    setIsUploadingDoc(true);
    try {
      // Import the uploadToPinata function from the utils
      const { uploadToPinata, validateFile } = await import('@/utils/storage/ipfsUploadUtils');
      
      // Validate file
      validateFile(selectedDocFile);

      // Upload to IPFS via Pinata
      const ipfsResult = await uploadToPinata(selectedDocFile, caseData.id);
      const cid = ipfsResult.cid;

      // Determine which column to update based on upload type
      const columnToUpdate = uploadType === 'transcript' ? 'transcript_cid' : 'judge_verdict_cid';
      
      // Determine which session to update
      let sessionId: string;
      
      if (uploadType === 'transcript') {
        // For transcript, use the active session
        if (!activeSession) {
          toast.error("No active session found for transcript upload");
          return;
        }
        sessionId = activeSession.id;
      } else {
        // For verdict, find the most recent session (active, paused, or ended)
        const { data: recentSession, error: sessionError } = await supabase
          .from('session_logs')
          .select('id')
          .eq('case_id', caseData.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessionError || !recentSession) {
          toast.error("No session found for verdict upload");
          return;
        }
        sessionId = recentSession.id;
      }

      // Update the session_logs table with the CID
      const { error: updateError } = await supabase
        .from('session_logs')
        .update({ [columnToUpdate]: cid })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      toast.success(`${uploadType === 'transcript' ? 'Transcript' : 'Judge Verdict'} uploaded successfully! CID: ${cid.slice(0, 20)}...`);
      
      // Reset state
      setSelectedDocFile(null);
      setUploadType(null);
      
      // Refresh active session to show updated data
      const { data: updatedSession } = await supabase
        .from('session_logs')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (updatedSession) {
        setActiveSession(updatedSession as ActiveSession);
      }
      
    } catch (error: any) {
      console.error('Error uploading session document:', error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  return (
    <GlassCard className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">Case Management</h2>
            <p className="text-slate-400 font-mono mt-1">
              {caseData.case_number}
            </p>
            {/* Database Assignment Status */}
            <div className="flex gap-2 mt-2">
              {caseData.assigned_judge_id && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border text-xs">
                  <Gavel className="w-3 h-3 mr-1" /> Judge Assigned
                </Badge>
              )}
              {caseData.lawyer_party_a_id && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 border text-xs">
                  <User className="w-3 h-3 mr-1" /> Lawyer A Assigned
                </Badge>
              )}
              {caseData.lawyer_party_b_id && (
                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 border text-xs">
                  <User className="w-3 h-3 mr-1" /> Lawyer B Assigned
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Badge variant="outline" className="capitalize bg-white/5 border-white/10 text-slate-300">
          {caseData.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Blockchain Status Section */}
      {caseData.on_chain_case_id && (
        <div className="mb-8 p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Blockchain Status</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">
              On-Chain
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Chain ID:</span>
              <span className="text-sm font-mono text-white">{caseData.on_chain_case_id}</span>
            </div>
            
            {isLoadingBlockchain ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-400">Syncing with Smart Contract...</span>
              </div>
            ) : (
              <>
                {blockchainCaseDetails && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Chain Status:</span>
                    <span className="text-sm text-white capitalize">
                      {/* Mapping Enum: 0=Active, 1=Pending, 2=Closed */}
                      {blockchainCaseDetails.status === 0 ? "Active" : 
                       blockchainCaseDetails.status === 1 ? "Pending" : 
                       blockchainCaseDetails.status === 2 ? "Closed" : "Unknown"}
                    </span>
                  </div>
                )}
                
                {blockchainParticipants && (
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Judge Address</p>
                      <p className="text-xs font-mono text-white truncate" title={blockchainParticipants.judge}>
                        {blockchainParticipants.judge === "0x0000000000000000000000000000000000000000" 
                            ? (caseData.assigned_judge_id ? "Assigned in DB (Not Synced)" : "Not Assigned") 
                            : blockchainParticipants.judge}
                      </p>
                      {caseData.assigned_judge_id && blockchainParticipants.judge === "0x0000000000000000000000000000000000000000" && (
                        <p className="text-xs text-amber-400 mt-1">⚠️ Database assignment not synced to blockchain</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Clerk Address</p>
                      <p className="text-xs font-mono text-white truncate" title={blockchainParticipants.clerk}>
                        {blockchainParticipants.clerk}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Prosecution</p>
                      <p className="text-xs font-mono text-white truncate" title={blockchainParticipants.prosecution}>
                         {blockchainParticipants.prosecution === "0x0000000000000000000000000000000000000000" 
                            ? (caseData.lawyer_party_a_id ? "Assigned in DB (Not Synced)" : "Not Assigned") 
                            : blockchainParticipants.prosecution}
                      </p>
                      {caseData.lawyer_party_a_id && blockchainParticipants.prosecution === "0x0000000000000000000000000000000000000000" && (
                        <p className="text-xs text-amber-400 mt-1">⚠️ Database assignment not synced to blockchain</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Defence</p>
                      <p className="text-xs font-mono text-white truncate" title={blockchainParticipants.defence}>
                         {blockchainParticipants.defence === "0x0000000000000000000000000000000000000000" 
                            ? (caseData.lawyer_party_b_id ? "Assigned in DB (Not Synced)" : "Not Assigned") 
                            : blockchainParticipants.defence}
                      </p>
                      {caseData.lawyer_party_b_id && blockchainParticipants.defence === "0x0000000000000000000000000000000000000000" && (
                        <p className="text-xs text-amber-400 mt-1">⚠️ Database assignment not synced to blockchain</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Judge Reassignment */}
      <div className="mb-8 p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Gavel className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Reassign Judge</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <select
              value={selectedJudge}
              onChange={(e) => setSelectedJudge(e.target.value)}
              className="flex-1 h-12 px-4 rounded-lg border border-white/10 bg-white/5 text-white text-sm backdrop-blur-sm"
            >
              <option value="" className="bg-slate-800">Select a judge...</option>
              {judges.map((judge) => (
                <option key={judge.id} value={judge.id} className="bg-slate-800">
                  {judge.full_name} {judge.wallet_address ? `(${judge.wallet_address.slice(0, 6)}...)` : "(No Wallet)"}
                </option>
              ))}
            </select>
            
            <Button
              onClick={handleReassignJudge}
              disabled={!selectedJudge || isAssigningJudge}
              className="h-12 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg shadow-amber-500/20"
            >
              {isAssigningJudge ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <Check className="w-5 h-5 mr-2" /> Reassign </>}
            </Button>
          </div>
        </div>
      </div>

      {/* Lawyer Reassignment */}
      <div className="mb-8 p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Reassign Lawyers</h3>
        </div>
        
        <div className="space-y-4">
          {/* Lawyer A */}
          <div>
            <label className="text-sm text-slate-300 mb-2 block">Lawyer A (Prosecution)</label>
            <div className="flex gap-4">
              <select
                value={selectedLawyerA}
                onChange={(e) => setSelectedLawyerA(e.target.value)}
                className="flex-1 h-12 px-4 rounded-lg border border-white/10 bg-white/5 text-white text-sm backdrop-blur-sm"
              >
                <option value="" className="bg-slate-800">Select a lawyer...</option>
                {lawyers.map((lawyer) => (
                  <option key={lawyer.id} value={lawyer.id} className="bg-slate-800">
                    {lawyer.full_name} {lawyer.wallet_address ? `(${lawyer.wallet_address.slice(0, 6)}...)` : "(No Wallet)"}
                  </option>
                ))}
              </select>
              
              <Button
                onClick={handleReassignLawyerA}
                disabled={!selectedLawyerA || isAssigningLawyerA}
                className="h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20"
              >
                {isAssigningLawyerA ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <Check className="w-5 h-5 mr-2" /> Reassign </>}
              </Button>
            </div>
          </div>
          
          {/* Lawyer B */}
          <div>
            <label className="text-sm text-slate-300 mb-2 block">Lawyer B (Defence)</label>
            <div className="flex gap-4">
              <select
                value={selectedLawyerB}
                onChange={(e) => setSelectedLawyerB(e.target.value)}
                className="flex-1 h-12 px-4 rounded-lg border border-white/10 bg-white/5 text-white text-sm backdrop-blur-sm"
              >
                <option value="" className="bg-slate-800">Select a lawyer...</option>
                {lawyers.map((lawyer) => (
                  <option key={lawyer.id} value={lawyer.id} className="bg-slate-800">
                    {lawyer.full_name} {lawyer.wallet_address ? `(${lawyer.wallet_address.slice(0, 6)}...)` : "(No Wallet)"}
                  </option>
                ))}
              </select>
              
              <Button
                onClick={handleReassignLawyerB}
                disabled={!selectedLawyerB || isAssigningLawyerB}
                className="h-12 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-500/20"
              >
                {isAssigningLawyerB ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <Check className="w-5 h-5 mr-2" /> Reassign </>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-8 bg-white/5 border border-white/10 backdrop-blur-lg">
          <TabsTrigger value="session-docs">
            <Mic className="w-4 h-4 mr-1 hidden sm:inline" /> Session Docs
          </TabsTrigger>
          <TabsTrigger value="view">
            <Eye className="w-4 h-4 mr-1 hidden sm:inline" /> View Evidence
          </TabsTrigger>
        </TabsList>

        {/* View Evidence - Always accessible, no blur */}
        <TabsContent value="view">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">View Evidence</h3>
                <p className="text-slate-400 text-sm">Review all uploaded evidence for this case</p>
              </div>
            </div>
            
            {/* Evidence Vault with Pending/Approved Sections */}
            <EvidenceVault 
              caseId={caseData.id}
              currentUserId={profile?.id || caseData.id}
              viewMode="all"
            />
          </div>
        </TabsContent>

        {/* Session Docs - Blurred when no active session */}
        <TabsContent value="session-docs">
          <div className="relative">
            {/* Blur overlay only when no active session */}
            {!activeSession && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                <div className="text-center p-6">
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 border mb-3">
                    <Clock className="w-3 h-3 mr-1" /> No Active Session
                  </Badge>
                  <p className="text-slate-300 text-sm">
                    Waiting for judge to start a court session...
                  </p>
                </div>
              </div>
            )}
            
            {/* Content - blurred and non-interactive when no session */}
            <div className={!activeSession ? "pointer-events-none opacity-50" : ""}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-600 to-orange-600">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Session Documents</h3>
                    <p className="text-slate-400 text-sm">Upload court transcripts and judge verdicts to IPFS</p>
                  </div>
                </div>

                {/* Active Session Status */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Active Session Status</span>
                    {isLoadingSession ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : activeSession ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">
                        <Check className="w-3 h-3 mr-1" /> Active Session
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 border">
                        <Clock className="w-3 h-3 mr-1" /> No Active Session
                      </Badge>
                    )}
                  </div>
                  {activeSession && (
                    <p className="text-xs text-slate-500 mt-2">
                      Session started: {new Date(activeSession.started_at).toLocaleString('en-IN')}
                      {activeSession.transcript_cid && (
                        <span className="text-emerald-400 ml-2">• Transcript uploaded</span>
                      )}
                      {activeSession.judge_verdict_cid && (
                        <span className="text-emerald-400 ml-2">• Verdict uploaded</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Upload Type Selector */}
                <div className="space-y-3">
                  <label className="text-sm text-slate-300 block">Select Document Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setUploadType('transcript')}
                      disabled={!activeSession}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        uploadType === 'transcript'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : activeSession 
                            ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Mic className="w-5 h-5" />
                        <span className="font-medium">Transcript</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Upload court session transcript (requires active session)
                      </p>
                    </button>
                    <button
                      onClick={() => setUploadType('verdict')}
                      disabled={!activeSession}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        uploadType === 'verdict'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                          : activeSession
                            ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Gavel className="w-5 h-5" />
                        <span className="font-medium">Judge Verdict</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Upload judge verdict document
                      </p>
                    </button>
                  </div>
                </div>

                {/* File Upload Area */}
                {uploadType && activeSession && (
                  <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">
                        Select {uploadType === 'transcript' ? 'Transcript' : 'Verdict'} File
                      </span>
                    </div>

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => setSelectedDocFile(e.target.files?.[0] || null)}
                      className="flex-1 h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-white text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 w-full"
                      disabled={isUploadingDoc}
                    />

                    {selectedDocFile && (
                      <p className="text-xs text-slate-400">
                        Selected: {selectedDocFile.name} ({(selectedDocFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}

                    {/* Dynamic Upload Button */}
                    <div className="flex justify-center pt-2">
                      <Button
                        onClick={handleSessionDocUpload}
                        disabled={
                          isUploadingDoc ||
                          !selectedDocFile ||
                          (uploadType === 'transcript' && !activeSession)
                        }
                        className={`font-medium px-6 py-2 rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                          uploadType === 'transcript'
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-500/20'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/20'
                        }`}
                      >
                        {isUploadingDoc ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading to IPFS...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadType === 'transcript' ? 'Upload Transcript to IPFS' : 'Upload Verdict to IPFS'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </GlassCard>
  );
};