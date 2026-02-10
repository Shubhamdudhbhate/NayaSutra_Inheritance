import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  uploadToPinata, 
  validateFile, 
  getEvidenceType,
  resolveIpfsUrl,
  type IpfsUploadResponse
} from '@/utils/storage/ipfsUploadUtils';
import { GlassCard } from '@/components/layout/GlassWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive,
  Search,
  RefreshCw,
  Trash2,
  Download,
  Eye
} from 'lucide-react';

interface EvidenceRecord {
  id: string;
  case_id: string;
  cid: string;
  file_name: string;
  category: 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'IMAGE' | 'OTHER';
  uploaded_by: string;
  created_at: string;
  cases?: {
    case_number: string;
    title: string;
  };
}

type UploadTab = 'upload' | 'view';

export const ClerkIPFSInterface = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<UploadTab>('upload');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [availableCases, setAvailableCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [allEvidence, setAllEvidence] = useState<EvidenceRecord[]>([]);
  const [filteredEvidence, setFilteredEvidence] = useState<EvidenceRecord[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Fetch available cases for the dropdown
  useEffect(() => {
    const fetchCases = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('cases')
          .select('id, case_number, title, created_at')
          .eq('clerk_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching cases:', error);
          toast.error('Failed to load cases');
        } else {
          setAvailableCases(data || []);
        }
      } catch (err) {
        console.error('Error fetching cases:', err);
        toast.error('Failed to load cases');
      } finally {
        setLoadingCases(false);
      }
    };

    fetchCases();
  }, [profile?.id]);

  // Fetch all evidence uploaded by this clerk
  useEffect(() => {
    const fetchAllEvidence = async () => {
      if (!profile?.id) return;

      setLoadingEvidence(true);
      try {
        const { data, error } = await supabase
          .from('case_evidence')
          .select(`
            *,
            cases!inner(
              case_number,
              title
            )
          `)
          .eq('uploaded_by', profile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching evidence:', error);
          toast.error('Failed to load evidence');
        } else {
          setAllEvidence(data || []);
          setFilteredEvidence(data || []);
        }
      } catch (err) {
        console.error('Error fetching evidence:', err);
        toast.error('Failed to load evidence');
      } finally {
        setLoadingEvidence(false);
      }
    };

    fetchAllEvidence();
  }, [profile?.id]);

  // Filter evidence based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEvidence(allEvidence);
    } else {
      const filtered = allEvidence.filter(item =>
        item.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cases?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cases?.case_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEvidence(filtered);
    }
  }, [searchTerm, allEvidence]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        validateFile(file);
        setSelectedFile(file);
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedCaseId) {
      toast.error('Please select a file and a case');
      return;
    }

    setUploading(true);
    try {
      // Upload to IPFS
      const ipfsResult: IpfsUploadResponse = await uploadToPinata(selectedFile, selectedCaseId);
      
      // Get file category
      const category = getEvidenceType(selectedFile);

      // Save to case_evidence table
      const { error } = await supabase
        .from('case_evidence')
        .insert({
          case_id: selectedCaseId,
          cid: ipfsResult.cid,
          file_name: ipfsResult.fileName,
          category: category,
          uploaded_by: profile?.id || ''
        });

      if (error) {
        throw error;
      }

      toast.success('File uploaded successfully!');
      setSelectedFile(null);
      setSelectedCaseId('');
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh evidence list
      if (profile?.id) {
        const { data } = await supabase
          .from('case_evidence')
          .select(`
            *,
            cases!inner(
              case_number,
              title
            )
          `)
          .eq('uploaded_by', profile.id)
          .order('created_at', { ascending: false });
        
        if (data) {
          setAllEvidence(data);
          setFilteredEvidence(data);
        }
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'IMAGE': return <Image className="w-4 h-4" />;
      case 'VIDEO': return <Video className="w-4 h-4" />;
      case 'AUDIO': return <Music className="w-4 h-4" />;
      case 'DOCUMENT': return <FileText className="w-4 h-4" />;
      default: return <Archive className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'IMAGE': return 'bg-green-100 text-green-800';
      case 'VIDEO': return 'bg-purple-100 text-purple-800';
      case 'AUDIO': return 'bg-blue-100 text-blue-800';
      case 'DOCUMENT': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const deleteEvidence = async (evidenceId: string) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return;

    try {
      const { error } = await supabase
        .from('case_evidence')
        .delete()
        .eq('id', evidenceId);

      if (error) throw error;

      toast.success('Evidence deleted successfully');
      
      // Refresh evidence list
      if (profile?.id) {
        const { data } = await supabase
          .from('case_evidence')
          .select(`
            *,
            cases!inner(
              case_number,
              title
            )
          `)
          .eq('uploaded_by', profile.id)
          .order('created_at', { ascending: false });
        
        if (data) {
          setAllEvidence(data);
          setFilteredEvidence(data);
        }
      }

    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete evidence');
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">IPFS Evidence Management</h2>
          <p className="text-slate-400 text-sm">Upload and manage case evidence on IPFS</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UploadTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Evidence
          </TabsTrigger>
          <TabsTrigger value="view" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            View Uploads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Case Selection */}
            <div className="space-y-2">
              <Label htmlFor="case-select">Select Case *</Label>
              <select
                id="case-select"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
                disabled={loadingCases}
              >
                <option value="">Choose a case...</option>
                {availableCases.map((case_) => (
                  <option key={case_.id} value={case_.id}>
                    {case_.case_number} - {case_.title}
                  </option>
                ))}
              </select>
              {loadingCases && (
                <p className="text-xs text-gray-500">Loading cases...</p>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-input">Select File *</Label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {selectedFile && (
                <div className="text-xs text-gray-600 mt-1">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !selectedCaseId || uploading}
              className="bg-indigo-600 hover:bg-indigo-700 px-8"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading to IPFS...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload to IPFS
                </>
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Upload Instructions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Select a case from your registered cases</li>
              <li>• Choose a file (max 100MB)</li>
              <li>• Files are uploaded to IPFS via Pinata</li>
              <li>• IPFS CID is stored in case_evidence table</li>
              <li>• Supported formats: Documents, Images, Videos, Audio</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="view" className="space-y-6 mt-6">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search by filename, case number, or case title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setSearchTerm('')}
              size="sm"
            >
              Clear
            </Button>
          </div>

          {/* Evidence Grid */}
          {loadingEvidence ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-gray-400" />
              <p className="text-gray-500 mt-2">Loading evidence...</p>
            </div>
          ) : filteredEvidence.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Archive className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 font-medium">No evidence found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchTerm ? 'Try adjusting your search terms' : 'Upload your first evidence to see it here'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvidence.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(item.category)}
                      <Badge className={`text-xs ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEvidence(item.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* File Info */}
                  <div className="space-y-2 mb-3">
                    <p className="font-medium text-gray-900 truncate" title={item.file_name}>
                      {item.file_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Case: {item.cases?.case_number} - {item.cases?.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a
                      href={resolveIpfsUrl(item.cid)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded text-xs font-medium hover:bg-indigo-700 transition-colors text-center"
                    >
                      <Eye className="w-3 h-3 inline mr-1" />
                      View
                    </a>
                    <a
                      href={resolveIpfsUrl(item.cid)}
                      download={item.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-xs font-medium hover:bg-gray-700 transition-colors text-center"
                    >
                      <Download className="w-3 h-3 inline mr-1" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </GlassCard>
  );
};
