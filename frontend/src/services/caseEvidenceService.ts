import { supabase } from '@/integrations/supabase/client';
import { EvidenceRecord } from '@/integrations/supabase/types';

/**
 * Evidence type for organizing different categories of evidence uploads
 * Used as metadata to distinguish between supplementary chargesheet, witness statements, etc.
 */
export type EvidenceUploadType = 
  | 'supplementary_chargesheet'
  | 'forensic_report'
  | 'witness_statement'
  | 'medical_report'
  | 'general_evidence'
  | 'other';

export interface CaseEvidenceInsert {
  case_id: string;
  cid: string;
  file_name: string;
  category: 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'IMAGE' | 'OTHER';
  uploaded_by: string;
  evidence_type?: EvidenceUploadType; // New field to distinguish upload type
}

export interface CaseEvidenceData extends EvidenceRecord {
  evidence_type?: EvidenceUploadType;
}

/**
 * Upload evidence to case_evidence table
 * Stores the IPFS CID and file metadata
 */
export const uploadCaseEvidence = async (
  evidenceData: CaseEvidenceInsert
): Promise<EvidenceRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('case_evidence')
      .insert({
        case_id: evidenceData.case_id,
        cid: evidenceData.cid,
        file_name: evidenceData.file_name,
        category: evidenceData.category,
        uploaded_by: evidenceData.uploaded_by
      } as any)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error uploading case evidence:", error);
      throw error;
    }

    return data as EvidenceRecord | null;
  } catch (err) {
    console.error("Upload case evidence error:", err);
    throw err;
  }
};

/**
 * Fetch all evidence for a case, optionally filtered by evidence type
 */
export const fetchCaseEvidence = async (
  caseId: string,
  evidenceType?: EvidenceUploadType
): Promise<EvidenceRecord[]> => {
  try {
    let query = supabase
      .from('case_evidence')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching case evidence:", error);
      throw error;
    }

    // Filter by evidence_type if specified
    if (evidenceType && data) {
      return data.filter((item: any) => item.evidence_type === evidenceType) as EvidenceRecord[];
    }

    return data as EvidenceRecord[];
  } catch (err) {
    console.error("Fetch case evidence error:", err);
    throw err;
  }
};

/**
 * Fetch evidence by specific category (DOCUMENT, IMAGE, VIDEO, AUDIO, OTHER)
 * Useful for filtering by file type
 */
export const fetchCaseEvidenceByCategory = async (
  caseId: string,
  category: 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'IMAGE' | 'OTHER'
): Promise<EvidenceRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('case_evidence')
      .select('*')
      .eq('case_id', caseId)
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching case evidence by category:", error);
      throw error;
    }

    return data as EvidenceRecord[];
  } catch (err) {
    console.error("Fetch case evidence by category error:", err);
    throw err;
  }
};

/**
 * Delete evidence record from case_evidence table
 */
export const deleteCaseEvidence = async (evidenceId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('case_evidence')
      .delete()
      .eq('id', evidenceId);

    if (error) {
      console.error("Error deleting case evidence:", error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error("Delete case evidence error:", err);
    throw err;
  }
};

/**
 * Get evidence count for a case
 */
export const getCaseEvidenceCount = async (caseId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('case_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', caseId);

    if (error) {
      console.error("Error counting case evidence:", error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("Get case evidence count error:", err);
    return 0;
  }
};
