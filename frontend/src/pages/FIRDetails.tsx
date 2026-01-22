import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Download,
  Eye,
  FileText,
  MapPin,
  Plus,
  Printer,
  RotateCw,
  User,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import jsPDF from "jspdf";
import {
  getFIRByNumber,
  listInvestigationFiles,
} from "@/services/policeService";
import AddSupplementModal from "@/components/police/AddSupplementModal";
import { FIR, InvestigationFile } from "@/types/case";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";

const FIRDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fir, setFir] = useState<FIR | null>(null);
  const [files, setFiles] = useState<InvestigationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalCategory, setModalCategory] = useState<
    "chargesheet" | "evidence"
  >("evidence");
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfScale, setPdfScale] = useState(1);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadData = async () => {
      try {
        const f = await getFIRByNumber(id);
        if (mounted) {
          setFir(f);
          if (f) {
            const fl = await listInvestigationFiles(f.id);
            if (mounted) setFiles(fl || []);
          }
        }
      } catch (e) {
        console.error("Error loading FIR:", e);
        if (mounted) {
          setFir(null);
          setFiles([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleFileAdded = (newFile: InvestigationFile) => {
    setFiles((prevFiles) => [...prevFiles, newFile]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center glass-card p-8 rounded-xl border border-white/10"
        >
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-xl text-white font-semibold mb-2">
            No FIR Selected
          </p>
          <p className="text-slate-400 mb-6">
            Please select a FIR from the list to view details.
          </p>
          <Button
            onClick={() => navigate("/police/dashboard")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!fir) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center glass-card p-8 rounded-xl border border-white/10"
        >
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-xl text-white font-semibold mb-2">FIR Not Found</p>
          <p className="text-slate-400 mb-6">
            The FIR you're looking for doesn't exist or has been deleted.
          </p>
          <Button
            onClick={() => navigate(-1)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // Generate PDF function
  const generateAndDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // Header
    doc.setFillColor(13, 27, 42);
    doc.rect(0, 0, pageWidth, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("FIRST INFORMATION REPORT (FIR)", pageWidth / 2, 12, {
      align: "center",
    });
    doc.setFontSize(9);
    doc.text("Maharashtra Police - NayaSutra System", pageWidth / 2, 22, {
      align: "center",
    });

    yPosition = 45;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // FIR Number
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("FIR NUMBER:", 15, yPosition);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(fir.fir_number || "N/A", 60, yPosition);
    yPosition += 8;

    // Police Station
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("POLICE STATION:", 15, yPosition);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(fir.police_station || "N/A", 60, yPosition);
    yPosition += 10;

    // Incident Date
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("INCIDENT DATE & TIME:", 15, yPosition);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(
      fir.incident_date
        ? new Date(fir.incident_date).toLocaleString("en-IN")
        : "N/A",
      60,
      yPosition,
    );
    yPosition += 8;

    // Incident Location
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("INCIDENT LOCATION:", 15, yPosition);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(fir.incident_place || "N/A", 60, yPosition);
    yPosition += 10;

    // Informant Details
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("INFORMANT NAME:", 15, yPosition);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(fir.informant_name || "N/A", 60, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("CONTACT NUMBER:", 15, yPosition);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(fir.informant_contact || "N/A", 60, yPosition);
    yPosition += 10;

    // Offense Nature
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("NATURE OF OFFENSE:", 15, yPosition);
    yPosition += 6;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const splitOffense = doc.splitTextToSize(fir.offense_nature || "N/A", 170);
    doc.text(splitOffense, 15, yPosition);
    yPosition += splitOffense.length * 5 + 5;

    // BNS Section
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("BNS SECTION(S):", 15, yPosition);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(fir.bns_section || "N/A", 60, yPosition);
    yPosition += 10;

    // Victim & Accused
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("VICTIM NAME:", 15, yPosition);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(fir.victim_name || "N/A", 60, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("ACCUSED NAME:", 15, yPosition);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(fir.accused_name || "Unknown/Not Identified", 60, yPosition);
    yPosition += 10;

    // Description
    if (fir.description) {
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text("DETAILED DESCRIPTION:", 15, yPosition);
      yPosition += 6;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const splitDescription = doc.splitTextToSize(fir.description, 170);
      doc.text(splitDescription, 15, yPosition);
    }

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Generated on: ${
        new Date().toLocaleString("en-IN")
      } | NayaSutra Legal Case Management`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    );

    // Download the PDF
    doc.save(`FIR-${fir.fir_number}.pdf`);
  };

  // Print function
  const handlePrint = () => {
    const printWindow = window.open("", "", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>FIR - ${fir.fir_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { text-align: center; color: #1a2a3a; }
              .section { margin-bottom: 15px; }
              .label { font-weight: bold; color: #333; }
              .value { margin-left: 10px; }
              .divider { border-bottom: 1px solid #ccc; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>FIRST INFORMATION REPORT (FIR)</h1>
            <div class="section">
              <span class="label">FIR Number:</span>
              <span class="value">${fir.fir_number}</span>
            </div>
            <div class="section">
              <span class="label">Police Station:</span>
              <span class="value">${fir.police_station}</span>
            </div>
            <div class="section">
              <span class="label">Incident Date & Time:</span>
              <span class="value">${
        fir.incident_date
          ? new Date(fir.incident_date).toLocaleString("en-IN")
          : "N/A"
      }</span>
            </div>
            <div class="section">
              <span class="label">Incident Location:</span>
              <span class="value">${fir.incident_place}</span>
            </div>
            <div class="section">
              <span class="label">Informant Name:</span>
              <span class="value">${fir.informant_name}</span>
            </div>
            <div class="section">
              <span class="label">Contact Number:</span>
              <span class="value">${fir.informant_contact}</span>
            </div>
            <div class="divider"></div>
            <div class="section">
              <span class="label">Nature of Offense:</span>
              <div class="value">${fir.offense_nature}</div>
            </div>
            <div class="section">
              <span class="label">BNS Section(s):</span>
              <span class="value">${fir.bns_section}</span>
            </div>
            <div class="section">
              <span class="label">Victim Name:</span>
              <span class="value">${fir.victim_name}</span>
            </div>
            <div class="section">
              <span class="label">Accused Name:</span>
              <span class="value">${
        fir.accused_name || "Unknown/Not Identified"
      }</span>
            </div>
            <div class="divider"></div>
            <div class="section">
              <span class="label">Description:</span>
              <div class="value">${
        fir.description || "No description provided"
      }</div>
            </div>
            <div class="divider"></div>
            <p style="text-align: center; color: #999; font-size: 12px;">
              Generated on: ${new Date().toLocaleString("en-IN")}
            </p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="border-white/10 hover:bg-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-white" />
              </div>
              FIR Details
            </h1>
            <p className="text-slate-400">FIR Number: {fir.fir_number}</p>
          </div>
        </div>
        <Button
          onClick={() => setShowPdfViewer(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          <Eye className="w-5 h-5" />
          View FIR
        </Button>
      </motion.div>

      {/* Basic Information */}
      <motion.div
        variants={itemVariants}
        className="glass-card p-8 rounded-xl border border-white/10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <User className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-semibold text-white">
            Basic Information
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                FIR Number
              </p>
              <p className="text-lg font-semibold text-white">
                {fir.fir_number || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                Police Station
              </p>
              <p className="text-lg font-semibold text-white">
                {fir.police_station || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                Informant Name
              </p>
              <p className="text-lg font-semibold text-white">
                {fir.informant_name || "N/A"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                Contact Number
              </p>
              <p className="text-lg font-semibold text-white font-mono">
                {fir.informant_contact || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                Incident Date & Time
              </p>
              <p className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                {fir.incident_date
                  ? new Date(fir.incident_date).toLocaleString("en-IN")
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                Incident Location
              </p>
              <p className="text-lg font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                {fir.incident_place || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Offense & Legal Details */}
      <motion.div
        variants={itemVariants}
        className="glass-card p-8 rounded-xl border border-white/10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-semibold text-white">
            Offense & Legal Details
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                Nature of Offense
              </p>
              <p className="text-base font-semibold text-white bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                {fir.offense_nature || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                BNS Section(s)
              </p>
              <p className="text-base font-semibold text-white bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 font-mono">
                {fir.bns_section || "N/A"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                Victim Name
              </p>
              <p className="text-lg font-semibold text-white">
                {fir.victim_name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                Accused Name
              </p>
              <p className="text-lg font-semibold text-white">
                {fir.accused_name || "Unknown/Not Identified"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Detailed Description */}
      <motion.div
        variants={itemVariants}
        className="glass-card p-8 rounded-xl border border-white/10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-semibold text-white">
            Detailed Description
          </h2>
        </div>
        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
            {fir.description || "No description provided"}
          </p>
        </div>
      </motion.div>

      {/* Upload Section */}
      <motion.div
        variants={itemVariants}
        className="glass-card p-8 rounded-xl border border-white/10"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              Add Investigation Files
            </h2>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Button
            onClick={() => {
              setModalCategory("chargesheet");
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 py-6 text-base"
          >
            <Plus className="w-5 h-5" />
            Add Supplementary Chargesheet
          </Button>
          <Button
            onClick={() => {
              setModalCategory("evidence");
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 py-6 text-base"
          >
            <Plus className="w-5 h-5" />
            Add Proof / Evidence
          </Button>
        </div>
      </motion.div>

      {/* Investigation Files */}
      {files.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="glass-card p-8 rounded-xl border border-white/10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              Investigation Files
            </h2>
          </div>

          <div className="grid gap-4">
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-purple-500/30">
                        <FileText className="w-4 h-4 text-purple-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-purple-200">
                          {file.file_type || "Document"}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Uploaded: {file.uploaded_at
                            ? new Date(file.uploaded_at).toLocaleDateString(
                              "en-IN",
                            )
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    {file.notes && (
                      <p className="text-sm text-slate-300 mt-3 p-3 rounded bg-white/5 border border-white/10">
                        {file.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition-colors"
                      title="Open file"
                    >
                      <Eye className="w-5 h-5" />
                    </a>
                    <a
                      href={file.file_url}
                      download
                      className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition-colors"
                      title="Download file"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {showModal && (
        <AddSupplementModal
          firId={fir.id}
          onClose={() => setShowModal(false)}
          onAdded={handleFileAdded}
          category={modalCategory}
        />
      )}

      {/* PDF Viewer Panel */}
      {showPdfViewer && (
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          className="fixed right-0 top-0 h-full w-full md:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-l border-white/10 shadow-2xl shadow-black/50 z-50 flex flex-col"
        >
          {/* PDF Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  FIR Document
                </h3>
                <p className="text-xs text-slate-400">FIR: {fir.fir_number}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPdfViewer(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Professional Toolbar */}
          <div className="flex items-center gap-1 px-6 py-4 border-b border-white/10 bg-slate-950/30 backdrop-blur-sm sticky top-[73px] z-10 flex-wrap">
            {/* Zoom Controls Group */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-4">
              <Button
                onClick={() => setPdfScale(Math.max(0.5, pdfScale - 0.2))}
                variant="outline"
                size="sm"
                className="border-white/10 hover:bg-white/5"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <select
                value={Math.round(pdfScale * 100)}
                onChange={(e) => setPdfScale(parseInt(e.target.value) / 100)}
                className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white cursor-pointer hover:bg-white/20"
              >
                <option value="50">50%</option>
                <option value="75">75%</option>
                <option value="100">100%</option>
                <option value="125">125%</option>
                <option value="150">150%</option>
                <option value="200">200%</option>
                <option value="300">300%</option>
              </select>
              <Button
                onClick={() => setPdfScale(Math.min(3, pdfScale + 0.2))}
                variant="outline"
                size="sm"
                className="border-white/10 hover:bg-white/5"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setPdfScale(1)}
                variant="outline"
                size="sm"
                className="border-white/10 hover:bg-white/5"
                title="Reset Zoom"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Action Buttons Group */}
            <div className="flex items-center gap-1 ml-auto">
              <Button
                onClick={generateAndDownloadPDF}
                variant="outline"
                size="sm"
                className="border-white/10 hover:bg-white/5 flex items-center gap-1"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
                <span className="text-xs hidden sm:inline">Download</span>
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="border-white/10 hover:bg-white/5 flex items-center gap-1"
                title="Print"
              >
                <Printer className="w-4 h-4" />
                <span className="text-xs hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>

          {/* PDF Content Area */}
          <div className="flex-1 overflow-auto bg-slate-900/50 backdrop-blur-sm">
            <div className="p-8 flex items-center justify-center min-h-full">
              <div
                className="bg-white rounded-lg shadow-2xl"
                style={{
                  transform: `scale(${pdfScale})`,
                  transformOrigin: "top center",
                }}
              >
                <div className="w-[210mm] h-[297mm] bg-white p-8 text-slate-900 shadow-lg rounded-lg">
                  {/* FIR Document Content */}
                  <div className="space-y-6">
                    {/* Document Header */}
                    <div className="text-center border-b-2 border-slate-300 pb-4">
                      <h2 className="text-2xl font-bold mb-1">
                        FIRST INFORMATION REPORT (FIR)
                      </h2>
                      <p className="text-sm text-slate-600">
                        Maharashtra Police
                      </p>
                    </div>

                    {/* FIR Details */}
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          FIR Number
                        </p>
                        <p className="font-mono font-bold text-lg">
                          {fir.fir_number}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Police Station
                        </p>
                        <p className="font-semibold">
                          {fir.police_station || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Incident Date & Time
                        </p>
                        <p className="font-semibold">
                          {fir.incident_date || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Contact Number
                        </p>
                        <p className="font-mono">
                          {fir.informant_contact || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Incident Location
                        </p>
                        <p className="font-semibold">
                          {fir.incident_place || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Offense Nature */}
                    <div className="border-t-2 border-slate-200 pt-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                        Nature of Offense
                      </p>
                      <p className="text-sm leading-relaxed">
                        {fir.offense_nature || "No details provided"}
                      </p>
                    </div>

                    {/* IPC Sections */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                        BNS Section
                      </p>
                      <p className="text-sm font-mono">
                        {fir.bns_section || "Not specified"}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-4 border-t-2 border-slate-200 text-center text-xs text-slate-500">
                      <p>Generated on: {new Date().toLocaleDateString()}</p>
                      <p>NayaSutra - Legal Case Management System</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FIRDetails;
