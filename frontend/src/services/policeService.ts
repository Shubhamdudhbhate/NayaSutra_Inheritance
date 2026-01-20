import { supabase } from '@/integrations/supabase/client';
import { FIR, InvestigationFile } from '@/types/case';

export const getFIRCounts = async (): Promise<{ total: number; pending: number }> => {
  const { count: total } = await supabase.from('firs').select('id', { count: 'exact', head: true });
  const { count: pending } = await supabase
    .from('firs')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'Closed');

  return { total: total ?? 0, pending: pending ?? 0 };
};

export const listFIRs = async (limit = 50): Promise<FIR[]> => {
  const { data, error } = await supabase
    .from('firs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as FIR[];
};

export const createFIR = async (payload: Partial<FIR>): Promise<FIR> => {
  const insert = await supabase.from('firs').insert(payload as any).select().maybeSingle();
  if (insert.error) throw insert.error;
  return insert.data as FIR;
};

export const getFIRById = async (id: string): Promise<FIR | null> => {
  const { data, error } = await supabase.from('firs').select('*').eq('firs.id', id).maybeSingle();
  if (error) throw error;
  return (data as FIR) ?? null;
};

export const listInvestigationFiles = async (firId: string): Promise<InvestigationFile[]> => {
  const { data, error } = await supabase
    .from('investigation_files')
    .select('*')
    .eq('investigation_files.fir_id', firId)
    .order('uploaded_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as InvestigationFile[];
};

export const uploadInvestigationFile = async (firId: string, file: File, fileType: string, notes?: string): Promise<InvestigationFile> => {
  // Upload to storage
  const path = `${firId}/${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('case-files')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from('case-files').getPublicUrl(uploadData.path);

  const { data, error } = await supabase.from('investigation_files').insert({
    fir_id: firId,
    file_url: publicUrlData.publicUrl,
    file_type: fileType as any,
    notes,
  }).select().maybeSingle();

  if (error) throw error;
  return data as InvestigationFile;
};
// Add this to src/services/policeService.ts

export const updateFirTxHash = async (firDbId: string, txHash: string) => {
  const { data, error } = await supabase
    .from('firs')
    .update({ 
        blockchain_tx_hash: txHash,
        is_on_chain: true 
    } as any)
    .eq('id', firDbId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
export const getFIRByNumber = async (firNumber: string): Promise<FIR | null> => {
  const { data, error } = await supabase
    .from('firs')
    .select('*')
    .eq('fir_number', firNumber)
    .maybeSingle(); // Returns null if not found, instead of throwing error

  if (error) throw error;
  return data as FIR;
};
