import { useState, useEffect } from "react";
import {
  Briefcase,
  Gavel,
  Upload,
  Check,
  Send,
  Loader2,
  User,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/layout/GlassWrapper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentUploadSection } from "./DocumentUploadSection";
import { SignatureSection } from "./SignatureSection";
import { 
  clerkReassignJudge, 
  clerkReassignLawyer, 
  getCaseDetails, 
  getCaseParticipants,
  type CaseDetails,
  type CaseParticipants
} from "@/utils/BlockChain_Interface/clerk";

type CaseData = {
  id: string;
  case_number: string;
  title: string;
  status: string;
  assigned_judge_id: string | null;
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

interface CaseManagementPanelProps {
  caseData: CaseData;
  onCaseUpdate?: () => void;
}

export const CaseManagementPanel = ({ caseData, onCaseUpdate }: CaseManagementPanelProps) => {
  const [activeTab, setActiveTab] = useState("documents");
  const [judges, setJudges] = useState<Profile[]>([]);
  const [lawyers, setLawyers] = useState<Profile[]>([]);
  
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

  // 3. IPFS Readiness Check
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
    if (!selectedJudge || !judgeDocUploaded) {
      toast.error("Please select a judge and upload supporting document");
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
      setJudgeDocUploaded(false);
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
              disabled={!selectedJudge || !judgeDocUploaded || isAssigningJudge}
              className="h-12 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg shadow-amber-500/20"
            >
              {isAssigningJudge ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <Check className="w-5 h-5 mr-2" /> Reassign </>}
            </Button>
          </div>
          
          {/* Document Upload for Judge Reassignment */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Supporting Document (Required)</span>
              {judgeDocUploaded && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">
                  <Check className="w-3 h-3 mr-1" /> Uploaded
                </Badge>
              )}
            </div>
            
            <div className="flex gap-3">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => e.target.files?.[0] && handleJudgeReassignmentDocumentUpload(e.target.files[0])}
                className="flex-1 h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-white text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                disabled={isUploadingJudgeDoc}
              />
              {isUploadingJudgeDoc && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
            </div>
            
            {!judgeDocUploaded && (
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Document upload is required before judge reassignment
              </p>
            )}
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
          <TabsTrigger value="documents">
            <Upload className="w-4 h-4 mr-1 hidden sm:inline" /> Documents
          </TabsTrigger>
          <TabsTrigger value="signatures">
            <Check className="w-4 h-4 mr-1 hidden sm:inline" /> Signatures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentUploadSection caseId={caseData.id} />
        </TabsContent>

        <TabsContent value="signatures">
          <SignatureSection
            caseData={caseData}
            judgeSignature={judgeSignature}
            lawyerASignature={lawyerASignature}
            lawyerBSignature={lawyerBSignature}
          />
        </TabsContent>
      </Tabs>

      {/* IPFS Button */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <Button
          className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/20 text-white font-medium"
          size="lg"
          onClick={handleSendToIPFS}
          disabled={!isReadyForIPFS || isSendingToIPFS}
        >
          {isSendingToIPFS ? (
            <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Preparing for IPFS... </>
          ) : (
            <> <Send className="w-5 h-5 mr-2" /> {isReadyForIPFS ? "Send to IPFS" : "Collect All Signatures to Enable IPFS"} </>
          )}
        </Button>
        {!isReadyForIPFS && (
          <p className="text-xs text-slate-400 text-center mt-3">
            Requires signatures from Judge and both Lawyers
          </p>
        )}
      </div>
    </GlassCard>
  );
};