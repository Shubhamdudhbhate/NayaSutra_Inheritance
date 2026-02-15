import { supabase } from "@/integrations/supabase/client";
import { SessionRecord, getSessionRecord } from "@/utils/BlockChain_Interface/judge";

export interface SessionLog {
  id: string;
  case_id: string;
  judge_id: string;
  status: "active" | "ended" | "paused" | "scheduled";
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Creates a new session log entry
 */
export const createSessionLog = async (
  caseId: string,
  judgeId: string,
  scheduledStartTime: string,
  notes?: string,
  status: "active" | "scheduled" = "active"
): Promise<SessionLog | null> => {
  try {
    const { data, error } = await supabase
      .from("session_logs")
      .insert({
        case_id: caseId,
        judge_id: judgeId,
        status: status as any, // Type assertion to allow 'scheduled' status
        started_at: scheduledStartTime,
        notes: notes || "Session scheduled",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating session log:", error);
    return null;
  }
};

/**
 * Updates session status (e.g., from active to ended)
 */
export const updateSessionStatus = async (
  sessionId: string,
  status: "active" | "ended" | "paused",
  endTime?: string,
  notes?: string
): Promise<boolean> => {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (endTime) {
      updateData.ended_at = endTime;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from("session_logs")
      .update(updateData)
      .eq("id", sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating session status:", error);
    return false;
  }
};

/**
 * Gets all session logs for a specific case
 */
export const getCaseSessions = async (caseId: string): Promise<SessionLog[]> => {
  try {
    const { data, error } = await supabase
      .from("session_logs")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching case sessions:", error);
    return [];
  }
};

/**
 * Gets the active session for a case (if any)
 */
export const getActiveSession = async (caseId: string): Promise<SessionLog | null> => {
  try {
    const { data, error } = await supabase
      .from("session_logs")
      .select("*")
      .eq("case_id", caseId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 is "not found"
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error fetching active session:", error);
    return null;
  }
};

/**
 * Updates session notes
 */
export const updateSessionNotes = async (
  sessionId: string,
  notes: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("session_logs")
      .update({
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating session notes:", error);
    return false;
  }
};

/**
 * Gets sessions for a specific judge
 */
export const getJudgeSessions = async (judgeId: string): Promise<SessionLog[]> => {
  try {
    const { data, error } = await supabase
      .from("session_logs")
      .select(`
        *,
        cases (
          case_number,
          title,
          party_a_name,
          party_b_name
        )
      `)
      .eq("judge_id", judgeId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching judge sessions:", error);
    return [];
  }
};

// ===== BLOCKCHAIN INTEGRATED SESSION FUNCTIONS =====

export interface BlockchainSessionResult {
  databaseSession: SessionLog | null;
  blockchainReceipt: any | null;
  success: boolean;
  error?: string;
}

/**
 * Creates a session in both database and blockchain
 */
export const createIntegratedSession = async (
  caseId: string,
  judgeId: string,
  scheduledStartTime: string,
  notes?: string
): Promise<BlockchainSessionResult> => {
  try {
    console.log('🚀 Starting integrated session creation for case:', caseId);
    
    // First, create session in database
    const { data: dbSession, error: dbError } = await supabase
      .from("session_logs")
      .insert({
        case_id: caseId,
        judge_id: judgeId,
        status: "active",
        started_at: scheduledStartTime,
        notes: notes || "Session started",
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database session creation failed:', dbError);
      return {
        databaseSession: null,
        blockchainReceipt: null,
        success: false,
        error: 'Database session creation failed'
      };
    }

    console.log('✅ Database session created successfully:', dbSession);

    // Blockchain finalization happens separately via judgeFinalizeSession
    // when judge signs and session is finalized

    return {
      databaseSession: dbSession,
      blockchainReceipt: null,
      success: !!dbSession,
      error: undefined
    };

  } catch (error) {
    console.error('❌ Integrated session creation failed:', error);
    return {
      databaseSession: null,
      blockchainReceipt: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Ends a session in both database and blockchain
 */
export const endIntegratedSession = async (
  caseId: string,
  sessionId: string,
  endTime: string,
  notes?: string,
  ipfsCid?: string
): Promise<BlockchainSessionResult> => {
  try {
    console.log('🛑 Ending integrated session for case:', caseId);
    
    // First, update session in database
    const { data: dbSession, error: dbError } = await supabase
      .from("session_logs")
      .update({
        status: "ended",
        ended_at: endTime,
        notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database session update failed:', dbError);
      return {
        databaseSession: null,
        blockchainReceipt: null,
        success: false,
        error: 'Database session update failed'
      };
    }

    console.log('✅ Database session updated successfully:', dbSession);

    // Blockchain finalization happens separately via judgeFinalizeSession
    // when judge signs and session is finalized

    return {
      databaseSession: dbSession,
      blockchainReceipt: null,
      success: !!dbSession,
      error: undefined
    };

  } catch (error) {
    console.error('❌ Integrated session end failed:', error);
    return {
      databaseSession: null,
      blockchainReceipt: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Gets blockchain session details for a case
 */
export const getBlockchainSession = async (
  caseId: string,
  sessionId: string
): Promise<SessionRecord | null> => {
  try {
    const sessionRecord = await getSessionRecord(caseId, sessionId);
    return sessionRecord;
  } catch (error) {
    console.error('Error fetching blockchain session:', error);
    return null;
  }
};
