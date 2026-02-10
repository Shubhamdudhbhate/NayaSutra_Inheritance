import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/layout/GlassWrapper';
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive,
  Eye,
  Check,
  X,
  Loader2,
  Clock
} from 'lucide-react';

// Type definitions based on the schema
type EvidenceStatusType = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPROVED' | null;
type EvidenceFileType = 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'IMAGE' | 'OTHER';
type UploaderRoleType = 'POLICE' | 'LAWYER' | 'JUDGE' | 'CLERK';

interface StagingEvidence {
  id: string;
  case_id: string;
  uploader_uuid: string;
  uploader_role: UploaderRoleType;
  file_url: string;
  file_type: EvidenceFileType;
  evidence_status: EvidenceStatusType;
  upload_timestamp: string | null;
  profiles?: {
    full_name: string;
  };
  cases?: {
    case_number: string;
    title: string;
  };
}

interface ReviewVaultProps {
  caseId?: string; // Optional: if provided, shows evidence for specific case only
}

export const ReviewVault: React.FC<ReviewVaultProps> = ({ caseId }) => {
  const { profile } = useAuth();
  const [pendingEvidence, setPendingEvidence] = useState<StagingEvidence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Fetch pending evidence from staging_evidence table
  const fetchPendingEvidence = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('staging_evidence')
        .select(`
          *,
          profiles!staging_evidence_uploader_uuid_fkey (
            full_name
          ),
          cases!staging_evidence_case_id_fkey (
            case_number,
            title
          )
        `)
        .eq('evidence_status', 'PENDING')
        .order('upload_timestamp', { ascending: false });

      // If caseId is provided, filter by case
      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPendingEvidence(data || []);
    } catch (error: any) {
      console.error('Error fetching pending evidence:', error);
      toast.error('Failed to fetch pending evidence');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEvidence();
  }, [caseId]);

  // Get file icon based on file type
  const getFileIcon = (fileType: EvidenceFileType) => {
    switch (fileType) {
      case 'IMAGE':
        return <Image className="w-8 h-8 text-blue-400" />;
      case 'VIDEO':
        return <Video className="w-8 h-8 text-green-400" />;
      case 'AUDIO':
        return <Music className="w-8 h-8 text-purple-400" />;
      case 'DOCUMENT':
        return <FileText className="w-8 h-8 text-red-400" />;
      default:
        return <Archive className="w-8 h-8 text-gray-400" />;
    }
  };

  // Handle evidence rejection
  const handleReject = async (evidenceId: string) => {
    setProcessingIds(prev => new Set(prev).add(evidenceId));
    
    try {
      const { error } = await supabase
        .from('staging_evidence')
        .update({ evidence_status: 'REJECTED' })
        .eq('id', evidenceId);

      if (error) throw error;

      toast.success('Evidence rejected successfully');
      // Remove from pending list
      setPendingEvidence(prev => prev.filter(item => item.id !== evidenceId));
    } catch (error: any) {
      console.error('Error rejecting evidence:', error);
      toast.error('Failed to reject evidence');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(evidenceId);
        return newSet;
      });
    }
  };

  // Handle evidence acceptance and IPFS upload
  const handleAccept = async (evidence: StagingEvidence) => {
    if (!profile?.id) {
      toast.error('Judge authentication required. Please log in again.');
      return;
    }

    setProcessingIds(prev => new Set(prev).add(evidence.id));
    
    try {
      // 1. Download the file from Cloudinary
      const response = await fetch(evidence.file_url);
      if (!response.ok) throw new Error('Failed to download file from Cloudinary');
      
      const blob = await response.blob();
      const file = new File([blob], evidence.file_url.split('/').pop() || 'evidence', {
        type: blob.type
      });

      // 2. Upload to IPFS
      const { uploadToPinata } = await import('@/utils/storage/ipfsUploadUtils');
      const ipfsResult = await uploadToPinata(file, evidence.case_id);

      // 3. Update staging_evidence status to APPROVED (using the correct enum value)
      const { error: stagingError } = await supabase
        .from('staging_evidence')
        .update({ evidence_status: 'APPROVED' })
        .eq('id', evidence.id);

      if (stagingError) throw stagingError;

      // 4. Add to case_evidence table with judge as uploader
      // First check if this evidence already exists
      const { data: existingEvidence } = await supabase
        .from('case_evidence')
        .select('id')
        .eq('case_id', evidence.case_id)
        .eq('cid', ipfsResult.cid)
        .maybeSingle();

      if (existingEvidence) {
        // Evidence already exists, just update the status
        toast.success('Evidence already exists in IPFS vault');
      } else {
        // Insert new evidence record
        const insertData = {
          case_id: evidence.case_id,
          cid: ipfsResult.cid,
          file_name: file.name,
          category: evidence.file_type,
          uploaded_by: profile?.id || '', // Judge's ID from profiles table
        };
        
        console.log('Inserting evidence:', insertData);
        
        const { error: caseError } = await supabase
          .from('case_evidence')
          .insert(insertData);

        if (caseError) {
          console.error('Case evidence insert error:', caseError);
          throw caseError;
        }
      }

      toast.success('Evidence accepted and uploaded to IPFS successfully');
      // Remove from pending list
      setPendingEvidence(prev => prev.filter(item => item.id !== evidence.id));
    } catch (error: any) {
      console.error('Error accepting evidence:', error);
      toast.error(error.message || 'Failed to accept evidence');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(evidence.id);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-400">Loading pending evidence...</span>
      </div>
    );
  }

  if (pendingEvidence.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">No Pending Evidence</h3>
        <p className="text-slate-400">All evidence has been reviewed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Pending Evidence Review</h3>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
          {pendingEvidence.length} Pending
        </Badge>
      </div>

      <div className="grid gap-4">
        {pendingEvidence.map((evidence) => (
          <GlassCard key={evidence.id} className="p-4">
            <div className="flex items-start gap-4">
              {/* File Icon */}
              <div className="flex-shrink-0">
                {getFileIcon(evidence.file_type)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-white truncate">
                      {evidence.file_url.split('/').pop()}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {evidence.file_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {evidence.uploader_role}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-slate-400">
                        Uploaded by: <span className="text-slate-300">{evidence.profiles?.full_name || 'Unknown'}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Case: <span className="text-slate-300">{evidence.cases?.case_number} - {evidence.cases?.title}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {evidence.upload_timestamp ? new Date(evidence.upload_timestamp).toLocaleString() : 'Unknown time'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(evidence.file_url, '_blank')}
                      className="h-8 px-2"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(evidence.id)}
                      disabled={processingIds.has(evidence.id)}
                      className="h-8 px-2 text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/10"
                    >
                      {processingIds.has(evidence.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAccept(evidence)}
                      disabled={processingIds.has(evidence.id)}
                      className="h-8 px-2 text-green-400 hover:text-green-300 border-green-500/20 hover:bg-green-500/10"
                    >
                      {processingIds.has(evidence.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
