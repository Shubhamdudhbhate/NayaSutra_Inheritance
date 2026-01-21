import { useState, useEffect } from "react";
import {
  Briefcase,
  Gavel,
  MessageSquare,
  FileText,
  Upload,
  Check,
  Send,
  Loader2,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/layout/GlassWrapper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConversationSection } from "./ConversationSection";
import { JudgeStatementSection } from "./JudgeStatementSection";
import { DocumentUploadSection } from "./DocumentUploadSection";
import { SignatureSection } from "./SignatureSection";

type CaseData = {
  id: string;
  case_number: string;
  title: string;
  status: string;
  assigned_judge_id: string | null;
  lawyer_party_a_id: string | null;
  lawyer_party_b_id: string | null;
  assigned_judge?: { full_name: string } | null;
  lawyer_party_a?: { full_name: string } | null;
  lawyer_party_b?: { full_name: string } | null;
};

type Profile = {
  id: string;
  full_name: string;
  role_category: string;
  unique_id: string | null;
};

interface CaseManagementPanelProps {
  caseData: CaseData;
  onCaseUpdate?: () => void;
}

export const CaseManagementPanel = ({ caseData, onCaseUpdate }: CaseManagementPanelProps) => {
  const [activeTab, setActiveTab] = useState("conversation");
  const [judges, setJudges] = useState<Profile[]>([]);
  const [selectedJudge, setSelectedJudge] = useState(caseData.assigned_judge_id || "");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  
  // Signature states (read-only - signatures come from respective dashboards)
  const [judgeSignature] = useState<string | null>(null);
  const [lawyerASignature] = useState<string | null>(null);
  const [lawyerBSignature] = useState<string | null>(null);
  
  // IPFS state
  const [isReadyForIPFS, setIsReadyForIPFS] = useState(false);
  const [isSendingToIPFS, setIsSendingToIPFS] = useState(false);

  useEffect(() => {
    const fetchJudges = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role_category, unique_id")
        .eq("role_category", "judiciary");
      setJudges(data || []);
    };
    fetchJudges();
  }, []);

  useEffect(() => {
    // Check if all signatures are present
    if (judgeSignature && lawyerASignature && lawyerBSignature) {
      setIsReadyForIPFS(true);
    } else {
      setIsReadyForIPFS(false);
    }
  }, [judgeSignature, lawyerASignature, lawyerBSignature]);

  const handleAssignJudge = async () => {
    if (!selectedJudge) return;
    setIsAssigning(true);
    
    try {
      const { error } = await supabase
        .from("cases")
        .update({ assigned_judge_id: selectedJudge })
        .eq("id", caseData.id);

      if (error) throw error;
      toast.success("Judge assigned successfully!");
      onCaseUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign judge");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSendNotification = async () => {
    if (!caseData.assigned_judge_id) {
      toast.error("Please assign a judge first");
      return;
    }
    
    setIsSendingNotification(true);
    
    // Simulate notification sending
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast.success("Notification sent to assigned judge!");
    setIsSendingNotification(false);
  };

  const handleSendToIPFS = async () => {
    if (!isReadyForIPFS) {
      toast.error("All signatures are required before sending to IPFS");
      return;
    }

    setIsSendingToIPFS(true);
    
    // Prepare data for IPFS
    const ipfsPayload = {
      caseId: caseData.id,
      caseNumber: caseData.case_number,
      title: caseData.title,
      signatures: {
        judge: judgeSignature,
        lawyerPartyA: lawyerASignature,
        lawyerPartyB: lawyerBSignature,
      },
      timestamp: new Date().toISOString(),
    };

    // Simulate IPFS preparation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    console.log("IPFS Payload ready:", ipfsPayload);
    toast.success("Case package prepared for IPFS submission!");
    setIsSendingToIPFS(false);
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
          </div>
        </div>
        <Badge variant="outline" className="capitalize bg-white/5 border-white/10 text-slate-300">
          {caseData.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Judge Assignment Section */}
      <div className="mb-8 p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Gavel className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Judge Assignment</h3>
        </div>
        
        <div className="flex gap-4">
          <select
            value={selectedJudge}
            onChange={(e) => setSelectedJudge(e.target.value)}
            className="flex-1 h-12 px-4 rounded-lg border border-white/10 bg-white/5 text-white text-sm backdrop-blur-sm"
          >
            <option value="" className="bg-slate-800">Select a judge...</option>
            {judges.map((judge) => (
              <option key={judge.id} value={judge.id} className="bg-slate-800">
                {judge.full_name} {judge.unique_id ? `(${judge.unique_id})` : ""}
              </option>
            ))}
          </select>
          
          <Button
            onClick={handleAssignJudge}
            disabled={!selectedJudge || isAssigning}
            className="h-12 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg shadow-amber-500/20"
          >
            {isAssigning ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Assign
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleSendNotification}
            disabled={!caseData.assigned_judge_id || isSendingNotification}
            className="h-12 px-6 border-white/10 bg-white/5 hover:bg-white/10 text-white"
          >
            {isSendingNotification ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Bell className="w-5 h-5 mr-2" />
                Notify
              </>
            )}
          </Button>
        </div>
        
        {caseData.assigned_judge && (
          <p className="text-sm text-slate-400 mt-3">
            Currently assigned: <span className="text-white font-medium">{caseData.assigned_judge.full_name}</span>
          </p>
        )}
      </div>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-8 bg-white/5 border border-white/10 backdrop-blur-lg">
          <TabsTrigger value="conversation" className="text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <MessageSquare className="w-4 h-4 mr-1 hidden sm:inline" />
            Conversation
          </TabsTrigger>
          <TabsTrigger value="statement" className="text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-1 hidden sm:inline" />
            Statement
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Upload className="w-4 h-4 mr-1 hidden sm:inline" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="signatures" className="text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Check className="w-4 h-4 mr-1 hidden sm:inline" />
            Signatures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversation">
          <ConversationSection caseId={caseData.id} />
        </TabsContent>

        <TabsContent value="statement">
          <JudgeStatementSection caseId={caseData.id} />
        </TabsContent>

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

      {/* IPFS Submit Button */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <Button
          className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/20 text-white font-medium"
          size="lg"
          onClick={handleSendToIPFS}
          disabled={!isReadyForIPFS || isSendingToIPFS}
        >
          {isSendingToIPFS ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Preparing for IPFS...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              {isReadyForIPFS ? "Send to IPFS" : "Collect All Signatures to Enable IPFS"}
            </>
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
