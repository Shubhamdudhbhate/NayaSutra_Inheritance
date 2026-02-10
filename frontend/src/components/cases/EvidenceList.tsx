import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveIpfsUrl } from '../../utils/storage/ipfsUploadUtils';
import { EvidenceRecord } from '@/integrations/supabase/types';
import { EvidenceUploadType } from '@/services/caseEvidenceService';

interface EvidenceListProps {
  caseId: string;
  evidenceType?: EvidenceUploadType; // Optional filter by evidence type
  filterCategory?: 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'IMAGE' | 'OTHER'; // Optional filter by file category
  title?: string; // Custom title for the list
}

export const EvidenceList = ({ 
  caseId, 
  evidenceType,
  filterCategory,
  title = 'Case Evidence'
}: EvidenceListProps) => {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvidence = async () => {
    setLoading(true);
    
    try {
      // ✅ Fetch from 'case_evidence'
      let query = supabase
        .from('case_evidence')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false }); // Show newest uploads first

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching evidence:", error);
        setEvidence([]);
      } else if (data) {
        let filteredData = data as EvidenceRecord[];

        // Apply category filter if specified
        if (filterCategory) {
          filteredData = filteredData.filter(item => item.category === filterCategory);
        }

        setEvidence(filteredData);
      }
    } catch (err) {
      console.error("Fetch evidence error:", err);
      setEvidence([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) fetchEvidence();
  }, [caseId, filterCategory]);

  const renderPreview = (item: EvidenceRecord) => {
    // Generate the viewable URL from the CID
    const url = resolveIpfsUrl(item.cid);

    switch (item.category) {
      case 'IMAGE':
        return (
          <img 
            src={url} 
            alt={item.file_name} 
            className="h-32 w-full object-cover rounded-md border border-gray-200" 
          />
        );
      case 'VIDEO':
        return (
          <video controls className="h-32 w-full object-cover rounded-md bg-black">
            <source src={url} type="video/mp4" />
            Your browser does not support video.
          </video>
        );
      case 'AUDIO':
        return (
          <div className="h-32 flex items-center justify-center bg-gray-100 rounded-md border border-gray-200">
            <audio controls className="w-full px-2">
              <source src={url} />
            </audio>
          </div>
        );
      default: // DOCUMENT or OTHER
        return (
          <div className="h-32 flex flex-col items-center justify-center bg-gray-50 rounded-md border border-gray-200">
            <span className="text-3xl">📄</span>
            <span className="text-xs text-gray-500 mt-2 font-medium uppercase">{item.category}</span>
          </div>
        );
    }
  };

  if (loading) return <div className="text-gray-500 text-sm animate-pulse">Loading evidence...</div>;

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <button 
          onClick={fetchEvidence} 
          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          Refresh
        </button>
      </div>

      {evidence.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500 font-medium">No evidence uploaded yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            {evidenceType 
              ? `Files uploaded as ${evidenceType.replace(/_/g, ' ')} will appear here.`
              : 'Files uploaded via IPFS will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {evidence.map((item) => (
            <div key={item.id} className="group border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white">
              {/* Preview Area */}
              <div className="mb-3 overflow-hidden rounded-md">
                {renderPreview(item)}
              </div>

              {/* Metadata */}
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900 truncate" title={item.file_name}>
                  {item.file_name}
                </p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                    {item.category}
                  </span>
                </div>
              </div>

              {/* View/Download Button */}
              <a 
                href={resolveIpfsUrl(item.cid)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full text-center bg-gray-900 text-white py-2 rounded text-xs font-medium hover:bg-black transition-colors"
              >
                View File
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};