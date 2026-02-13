import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, X } from "lucide-react";
import { IpfsUpload } from "@/components/cases/IpfsUpload";
import { supabase } from '@/integrations/supabase/client';
import { getCaseIdFromFirId } from '@/services/policeService';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InvestigationFileType } from "@/types/case";

interface Props {
  firId: string;
  onClose: () => void;
  onAdded?: (file: any) => void;
  category?: "chargesheet" | "evidence";
  uploaderUuid?: string;
}

const AddSupplementModal = (
  { firId, onClose, onAdded, category = "evidence", uploaderUuid }: Props,
) => {
  const isChargesheetOnly = category === "chargesheet";
  const [type, setType] = useState<InvestigationFileType>(
    isChargesheetOnly ? "Supplementary Chargesheet" : "Forensic Report",
  );
  const [notes, setNotes] = useState("");
  const [triggerUpload, setTriggerUpload] = useState(false);

  const chargesheetOptions = ["Supplementary Chargesheet"];
  const evidenceOptions = [
    "Forensic Report",
    "Witness Statement",
    "Medical Report",
    "Other Evidence",
  ];

  const documentTypeOptions = isChargesheetOnly
    ? chargesheetOptions
    : evidenceOptions;

  const resetForm = () => {
    setType(
      isChargesheetOnly ? "Supplementary Chargesheet" : "Forensic Report",
    );
    setNotes("");
    setTriggerUpload(false);
  };


  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleIpfsUploadSuccess = async (cid: string, fileName: string) => {
    try {
      // Step 1: Get actual case_id from fir_id
      const caseId = await getCaseIdFromFirId(firId);
      if (!caseId) {
        throw new Error("FIR is not linked to any case. Cannot upload supplementary report.");
      }

      // Step 2: Check for duplicate and save to case_evidence table
      const { data: existingEvidence, error: checkError } = await supabase
        .from('case_evidence')
        .select('id')
        .eq('case_id', caseId)
        .eq('cid', cid)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingEvidence) {
        throw new Error("This file has already been uploaded for this case.");
      }
      
      const { error: evidenceError } = await supabase.from('case_evidence').insert({
        case_id: caseId,
        cid: cid,
        file_name: fileName,
        category: 'DOCUMENT', // Default category
        uploaded_by: uploaderUuid || '00000000-0000-0000-0000-000000000000'
      });
      
      console.log("DEBUG: Inserting into case_evidence with case_id:", caseId);
      console.log("DEBUG: Insert error:", evidenceError);

      if (evidenceError) throw evidenceError;

      // Step 3: Save to investigation_files table (for UI cards) - store complete Pinata URL
      const pinataUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      const { data: investigationData, error: investigationError } = await supabase.from('investigation_files').insert({
        file_url: pinataUrl, // Complete Pinata URL (gateway + CID)
        file_type: type, // Use selected type
        notes: notes,
        fir_id: firId
      }).select().maybeSingle();

      if (investigationError) throw investigationError;

      if (onAdded) {
        onAdded(investigationData);
      }
      
      toast.success("File uploaded successfully to IPFS");
      resetForm();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Upload failed");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTriggerUpload(true); // Trigger upload in IpfsUpload component
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-1"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-8 rounded-xl border border-white/10 w-full max-w-lg shadow-2xl shadow-emerald-500/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Upload className="w-3 h-3" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                Add Investigation File
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload evidence, reports, or supplementary documents
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Document Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as InvestigationFileType)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none transition-colors appearance-none cursor-pointer"
              style={{
                backgroundImage:
                  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                paddingRight: "2.5rem",
              }}
              disabled={isChargesheetOnly}
            >
              {documentTypeOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-900">
                  {option}
                </option>
              ))}
            </select>
            {isChargesheetOnly && (
              <p className="text-xs text-slate-400 mt-1">
                Only Supplementary Chargesheet can be uploaded in this section
              </p>
            )}
          </div>

          {/* IPFS Upload Component */}
          <div>
            <label className="block text-sm font-semibold text-white mb-1">
              Upload File
            </label>
            <IpfsUpload
              caseId={null} // Don't use caseId for FIR uploads - handle in callback
              userProfileId={uploaderUuid || ''}
              evidenceType={type as any} // Cast to any for compatibility
              triggerUpload={triggerUpload}
              onUploadSuccess={handleIpfsUploadSuccess}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Notes / Description
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes about this document..."
              className="w-full px-4 py-1 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none transition-colors resize-none"
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-white/10 hover:bg-white/5 text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AddSupplementModal;
