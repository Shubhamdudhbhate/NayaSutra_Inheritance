import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, X } from "lucide-react";
import { InvestigationFile } from "@/types/case";
import { uploadInvestigationFile } from "@/services/policeService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  firId: string;
  onClose: () => void;
  onAdded: (file: InvestigationFile) => void;
  category?: "chargesheet" | "evidence";
}

const AddSupplementModal = (
  { firId, onClose, onAdded, category = "evidence" }: Props,
) => {
  const isChargesheetOnly = category === "chargesheet";
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState(
    isChargesheetOnly ? "Supplementary Chargesheet" : "Forensic Report",
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

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
    setFile(null);
    setType(
      isChargesheetOnly ? "Supplementary Chargesheet" : "Forensic Report",
    );
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setLoading(true);
    try {
      const added = await uploadInvestigationFile(firId, file, type, notes);
      onAdded(added);
      toast.success("File uploaded successfully");
      resetForm();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
              <Upload className="w-5 h-5" />
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Document Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
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

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Select File
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="file-upload"
                disabled={loading}
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full px-4 py-8 rounded-lg border-2 border-dashed border-white/20 hover:border-emerald-500/30 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
              >
                <div className="text-center">
                  <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400 mx-auto mb-2 group-hover:bg-emerald-500/30 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  {file
                    ? (
                      <div>
                        <p className="font-semibold text-emerald-300">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )
                    : (
                      <div>
                        <p className="font-semibold text-white">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-slate-400">
                          PDF, DOC, DOCX, JPG, PNG up to 50MB
                        </p>
                      </div>
                    )}
                </div>
              </label>
            </div>
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
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none transition-colors resize-none"
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-white/10 hover:bg-white/5 text-white"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20"
              disabled={loading || !file}
            >
              {loading
                ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Uploading...
                  </>
                )
                : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </>
                )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AddSupplementModal;
