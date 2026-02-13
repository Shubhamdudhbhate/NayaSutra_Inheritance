// src/services/sessionFinalizationService.ts

import { supabase } from "@/integrations/supabase/client";
import { uploadJsonToPinata, fetchJsonFromIpfs } from "@/utils/storage/ipfsUploadUtils";
import { toast } from "sonner";

// Types for session finalization data
export interface PartySignature {
  userId: string;
  userName: string;
  role: string;
  signature: string;
  signedAt: string;
}

export interface SessionFinalizationData {
  // IPFS CIDs
  judge_verdict_cid: string | null;
  session_transcript_cid: string | null;
  
  // Evidence CIDs from the session
  evidence_finalized: Array<{
    cid: string;
    file_name: string;
    category: string;
    uploaded_by: string;
    uploaded_at: string;
  }>;
  
  // Signatures from all parties
  judge_signature: PartySignature | null;
  clerk_signature: PartySignature | null;
  lawyer_defendant_signature: PartySignature | null;
  lawyer_prosecution_signature: PartySignature | null;
  
  // Session metadata
  session_id: string;
  case_id: string;
  case_number: string;
  session_started_at: string;
  session_ended_at: string;
  finalized_at: string;
  notes?: string;
}

/**
 * Fetches all session data needed for finalization
 */
export const fetchSessionFinalizationData = async (
  sessionId: string,
  caseId: string,
  caseNumber: string
): Promise<Partial<SessionFinalizationData>> => {
  try {
    // 1. Fetch session logs data
    const { data: sessionData, error: sessionError } = await supabase
      .from("session_logs")
      .select("transcript_cid, judge_verdict_cid, started_at, ended_at, notes")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) throw sessionError;

    // 2. Fetch evidence uploaded DURING this session (between start and end dates)
    const sessionStartDate = sessionData?.started_at;
    const sessionEndDate = sessionData?.ended_at || new Date().toISOString();
    
    const { data: evidenceData, error: evidenceError } = await supabase
      .from("case_evidence")
      .select("cid, file_name, category, uploaded_by, created_at")
      .eq("case_id", caseId)
      .gte("created_at", sessionStartDate)
      .lte("created_at", sessionEndDate)
      .order("created_at", { ascending: false });

    if (evidenceError) throw evidenceError;

    // 3. Fetch all party signatures from notifications
    const { data: notifications, error: notifError } = await supabase
      .from("notifications")
      .select("user_id, signature, confirmed_at, metadata")
      .eq("session_id", sessionId)
      .not("signature", "is", null);

    if (notifError) throw notifError;

    // 4. Fetch user profiles to get names and roles
    const userIds = notifications?.map(n => n.user_id) || [];
    let profiles: Array<{ id: string; full_name: string; role_category: string }> = [];
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, role_category")
        .in("id", userIds);
      profiles = profilesData || [];
    }

    // 5. Map signatures to their roles
    const signatures: Partial<Record<string, PartySignature>> = {};
    
    notifications?.forEach(notification => {
      const profile = profiles.find(p => p.id === notification.user_id);
      const role = (profile?.role_category || "unknown").toLowerCase(); // Normalize to lowercase
      
      const partySig: PartySignature = {
        userId: notification.user_id,
        userName: profile?.full_name || "Unknown",
        role: role,
        signature: notification.signature!,
        signedAt: notification.confirmed_at!,
      };

      if (role === "judge" || role === "judiciary") {
        signatures.judge_signature = partySig;
      } else if (role === "clerk") {
        signatures.clerk_signature = partySig;
      } else if (role === "lawyer") {
        // Determine if prosecution or defense based on metadata or case association
        const metadata = notification.metadata as { party?: string } | null;
        if (metadata?.party === "defendant" || metadata?.party === "defense") {
          signatures.lawyer_defendant_signature = partySig;
        } else if (metadata?.party === "prosecution" || metadata?.party === "plaintiff") {
          signatures.lawyer_prosecution_signature = partySig;
        } else {
          // Fallback: if party metadata not set, default to prosecution
          signatures.lawyer_prosecution_signature = partySig;
        }
      }
    });

    return {
      judge_verdict_cid: sessionData?.judge_verdict_cid || null,
      session_transcript_cid: sessionData?.transcript_cid || null,
      evidence_finalized: (evidenceData || []).map(ev => ({
        cid: ev.cid,
        file_name: ev.file_name,
        category: ev.category,
        uploaded_by: ev.uploaded_by,
        uploaded_at: ev.created_at,
      })),
      session_id: sessionId,
      case_id: caseId,
      case_number: caseNumber,
      session_started_at: sessionData?.started_at || new Date().toISOString(),
      session_ended_at: sessionData?.ended_at || new Date().toISOString(),
      notes: sessionData?.notes || undefined,
      ...signatures,
    };
  } catch (error) {
    console.error("Error fetching session finalization data:", error);
    throw error;
  }
};

/**
 * Uploads the complete session finalization data to IPFS and updates session_logs
 */
export const finalizeAndUploadSession = async (
  sessionId: string,
  caseId: string,
  caseNumber: string,
  judgeId: string
): Promise<{ success: boolean; cid: string | null }> => {
  try {
    // 1. Fetch all session data
    const sessionData = await fetchSessionFinalizationData(sessionId, caseId, caseNumber);

    // 2. Create finalization JSON
    const finalizationData: SessionFinalizationData = {
      ...sessionData as SessionFinalizationData,
      finalized_at: new Date().toISOString(),
    };

    // 3. Upload to IPFS via Pinata
    const uploadResult = await uploadJsonToPinata(
      finalizationData,
      `session_finalization_${caseNumber}_${sessionId}`,
      {
        sessionId,
        caseId,
        caseNumber,
        judgeId,
      }
    );

    // 4. Update session_logs with the finalization_cid
    const { error: updateError } = await supabase
      .from("session_logs")
      .update({
        finalization_cid: uploadResult.cid,
        status: "ended",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error updating session_logs with finalization_cid:", updateError);
      throw updateError;
    }

    toast.success("Session finalized and stored on IPFS");
    return { success: true, cid: uploadResult.cid };
  } catch (error) {
    console.error("Error finalizing session:", error);
    toast.error("Failed to finalize session");
    return { success: false, cid: null };
  }
};

/**
 * Fetches and parses finalization data from IPFS
 */
export const fetchFinalizationData = async (
  finalizationCid: string
): Promise<SessionFinalizationData | null> => {
  try {
    const data = await fetchJsonFromIpfs<SessionFinalizationData>(finalizationCid);
    return data;
  } catch (error) {
    console.error("Error fetching finalization data:", error);
    return null;
  }
};

/**
 * Fetches all past sessions for a case with their finalization data
 */
export const fetchPastSessions = async (
  caseId: string
): Promise<Array<{
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  finalization_cid: string | null;
  transcript_cid: string | null;
  judge_verdict_cid: string | null;
  notes: string | null;
}>> => {
  try {
    const { data, error } = await supabase
      .from("session_logs")
      .select("id, started_at, ended_at, status, finalization_cid, transcript_cid, judge_verdict_cid, notes")
      .eq("case_id", caseId)
      .in("status", ["ended", "paused"])
      .order("started_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching past sessions:", error);
    return [];
  }
};
