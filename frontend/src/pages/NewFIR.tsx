import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, FileText, UploadCloud, CheckCircle, X } from "lucide-react";
import { ethers } from "ethers";

// --- IMPORTS ---
import { createFIR, updateFirTxHash, getFIRByNumber } from "@/services/policeService";
import { fileFir } from "@/utils/BlockChain_Interface/police"; 

const NewFIR = () => {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [firFile, setFirFile] = useState<File | null>(null);

  const [form, setForm] = useState<any>({
    fir_number: "",
    police_station: "",
    informant_name: "",
    informant_contact: "",
    incident_date: "",
    incident_place: "",
    offense_nature: "",
    bns_section: "", 
    accused_name: "",
    victim_name: "",
    description: "",
  });
  
  const navigate = useNavigate();

  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFirFile(e.target.files[0]);
  };

  const clearFile = () => setFirFile(null);

  // Mock IPFS Upload (Replace with real logic later)
  const mockUploadToPinata = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const dummyCid = "Qm" + ethers.keccak256(ethers.toUtf8Bytes(file.name + Date.now())).substring(2, 44);
        resolve(dummyCid);
      }, 1500); 
    });
  };

const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!firFile) {
      toast.error("Please upload the FIR Document (PDF).");
      return;
    }

    setLoading(true);
    
    try {
      // --- STEP 1: PREPARATION ---
      setLoadingStep("Validating & Hashing...");
      
      const ipcSectionsArray = form.bns_section
        ? form.bns_section.split(',').map((s: string) => s.trim())
        : ["General"];

      // Generate Integrity Hash
      const integrityPayload = JSON.stringify({
        fir_no: form.fir_number,
        desc: form.description,
        date: form.incident_date,
        place: form.incident_place,
        accused: form.accused_name
      });
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes(integrityPayload));

      // --- STEP 2: IPFS UPLOAD ---
      // Optimization: Only upload if we don't already have the CID? 
      // For simplicity, we assume we re-upload or you can cache it.
      setLoadingStep("Uploading to IPFS...");
      const ipfsCid = await mockUploadToPinata(firFile);
      
      // --- STEP 3: DATABASE SYNC (Check-or-Create) ---
      setLoadingStep("Syncing with Database...");
      
      let firRecordId = "";
      
      // A. Check if FIR already exists
      const existingFir = await getFIRByNumber(form.fir_number);

      if (existingFir) {
        console.log("FIR already exists in DB. Resuming submission...");
        
        // Safety Check: Is it already on blockchain?
        // if (existingFir.is_on_chain) {
        //   toast.error("This FIR is already filed on the Blockchain!");
        //   setLoading(false);
        //   return;
        // }
        
        // Reuse existing ID
        firRecordId = existingFir.id;
        
      } else {
        // B. Create NEW Record
        const supabasePayload = { 
          ...form,
          ipfs_cid: ipfsCid,
          content_hash: contentHash, 
          blockchain_tx_hash: "PENDING", 
          is_on_chain: false 
        };
        
        const createdRecord = await createFIR(supabasePayload);
        if (!createdRecord?.id) throw new Error("Database save failed");
        firRecordId = createdRecord.id;
      }

      // --- STEP 4: BLOCKCHAIN TRANSACTION ---
      // Now that we have a valid DB ID (new or existing), we can proceed safely
      setLoadingStep("Opening MetaMask...");
      
      const { txHash } = await fileFir(
        form.fir_number,
        form.police_station,
        ipcSectionsArray,
        ipfsCid, 
        form.accused_name || "Unknown",
        form.informant_name,
        contentHash
      );

      // --- STEP 5: FINALIZE ---
      setLoadingStep("Updating Record...");
      
      // Update the record (whether it was new or existing) with the Tx Hash
      await updateFirTxHash(firRecordId, txHash);

      toast.success("FIR filed successfully!");
      navigate(`/police/firs/${firRecordId}`);

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("user rejected") || err.code === 4001 || err.code === "ACTION_REJECTED") {
        toast.error("Transaction rejected by wallet.");
      } else {
        // Show specific database errors if they still leak through
        const msg = err.details || err.message || "Failed to create FIR";
        toast.error(msg);
      }
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  // ... (Keep your JSX exactly as it is) ...
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    // ... Paste your JSX here (no changes needed to the UI part) ...
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        {/* ... existing UI code ... */}
        {/* Just putting the wrapper here to confirm context */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 max-w-4xl mx-auto px-6 py-12">
            <motion.div variants={itemVariants} className="mb-8">
                <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4 text-slate-400 hover:text-slate-200">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Button>
                <h1 className="text-5xl font-bold text-white flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center">
                        <FileText className="w-7 h-7 text-white" />
                    </div>
                    Register New FIR
                </h1>
                <p className="text-slate-400">File a new First Information Report for investigation tracking</p>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card p-8 rounded-xl border border-white/10">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* ... Inputs ... */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-400" /> FIR Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">FIR Number *</label>
                                <Input name="fir_number" value={form.fir_number} onChange={handleChange} placeholder="e.g., MH-2026-001" className="bg-white/5 border-white/10 text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Police Station *</label>
                                <Input name="police_station" value={form.police_station} onChange={handleChange} placeholder="Police station name" className="bg-white/5 border-white/10 text-white" required />
                            </div>
                        </div>
                    </motion.div>

                    {/* File Upload UI */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <UploadCloud className="w-5 h-5 text-blue-400" /> Upload Official Document
                        </h2>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-6 bg-white/5 hover:bg-white/10 transition-colors text-center relative">
                            <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={loading} />
                            {!firFile ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                                        <UploadCloud className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Click to upload FIR PDF</p>
                                        <p className="text-slate-400 text-sm">PDF up to 10MB</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg relative z-20">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                                        <div className="text-left">
                                            <p className="text-emerald-300 font-medium truncate max-w-[200px]">{firFile.name}</p>
                                            <p className="text-emerald-500/60 text-xs">{(firFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={clearFile} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Other Inputs */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                                <Input name="informant_name" value={form.informant_name} onChange={handleChange} className="bg-white/5 border-white/10 text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Contact *</label>
                                <Input name="informant_contact" value={form.informant_contact} onChange={handleChange} className="bg-white/5 border-white/10 text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                                <Input name="informant_address" className="bg-white/5 border-white/10 text-white" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Date & Time *</label>
                                <Input name="incident_date" value={form.incident_date} onChange={handleChange} type="datetime-local" className="bg-white/5 border-white/10 text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Location *</label>
                                <Input name="incident_place" value={form.incident_place} onChange={handleChange} className="bg-white/5 border-white/10 text-white" required />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Offense Type *</label>
                                <Input name="offense_nature" value={form.offense_nature} onChange={handleChange} className="bg-white/5 border-white/10 text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">BNS Section</label>
                                <Input name="bns_section" value={form.bns_section} onChange={handleChange} className="bg-white/5 border-white/10 text-white" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Victim Name *</label>
                                <Input name="victim_name" value={form.victim_name} onChange={handleChange} className="bg-white/5 border-white/10 text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Accused Name</label>
                                <Input name="accused_name" value={form.accused_name} onChange={handleChange} className="bg-white/5 border-white/10 text-white" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                            <textarea name="description" value={form.description} onChange={handleChange} className="w-full h-32 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="flex gap-4 pt-6 border-t border-white/10">
                        <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 text-white">
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {loadingStep || "Processing..."}
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    File FIR (IPFS + Chain)
                                </>
                            )}
                        </Button>
                        <Button type="button" onClick={() => navigate("/dashboard")} variant="outline" className="flex-1 border-slate-600 text-slate-200">
                            Cancel
                        </Button>
                    </motion.div>
                </form>
            </motion.div>
        </motion.div>
    </div>
  );
};

export default NewFIR;