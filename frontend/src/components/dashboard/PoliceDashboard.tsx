import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getFIRCounts, listFIRs } from "@/services/policeService";
import { FIR } from "@/types/case";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const PoliceDashboard = () => {
  const [counts, setCounts] = useState({ total: 0, pending: 0 });
  const [firs, setFirs] = useState<FIR[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const c = await getFIRCounts();
        const list = await listFIRs(50);
        if (!mounted) return;
        setCounts(c);
        if (!Array.isArray(list)) {
          console.warn("policeService.listFIRs returned non-array:", list);
          setFirs([]);
        } else {
          setFirs(list);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredFirs = firs.filter(
    (fir) =>
      (fir?.fir_number ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (fir?.offense_nature ?? "").toLowerCase().includes(
        searchTerm.toLowerCase(),
      ),
  );

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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "closed":
      case "resolved":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      case "pending":
      case "investigation":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "under review":
        return "bg-blue-500/10 text-blue-300 border-blue-500/30";
      default:
        return "bg-slate-500/10 text-slate-300 border-slate-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "closed":
      case "resolved":
        return <CheckCircle2 className="w-4 h-4" />;
      case "pending":
      case "investigation":
        return <AlertCircle className="w-4 h-4" />;
      case "under review":
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <main className="p-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
                Police Dashboard
              </h1>
              <p className="text-slate-400">
                Manage FIR records and investigation cases
              </p>
            </div>
            <Link to="/police/new-fir">
              <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New FIR
              </Button>
            </Link>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-4 gap-6"
          >
            <motion.div
              variants={itemVariants}
              className="glass-card p-6 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Total FIRs</p>
                <p className="text-4xl font-bold text-white">{counts.total}</p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="glass-card p-6 rounded-xl border border-amber-500/30 hover:border-amber-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Pending Cases</p>
                <p className="text-4xl font-bold text-white">
                  {counts.pending}
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="glass-card p-6 rounded-xl border border-blue-500/30 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Closed Cases</p>
                <p className="text-4xl font-bold text-white">
                  {counts.total - counts.pending}
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="glass-card p-6 rounded-xl border border-cyan-500/30 hover:border-cyan-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Resolution Rate</p>
                <p className="text-4xl font-bold text-white">
                  {counts.total > 0
                    ? Math.round(
                      ((counts.total - counts.pending) / counts.total) * 100,
                    )
                    : 0}
                  %
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-3 gap-6"
          >
            {/* FIR List */}
            <motion.div
              variants={itemVariants}
              className="md:col-span-2 glass-card p-8 rounded-xl border border-white/10"
            >
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-emerald-400" />
                <h2 className="text-2xl font-semibold text-white">
                  Recent FIRs
                </h2>
              </div>

              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search by FIR number or offense..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              {filteredFirs.length === 0
                ? (
                  <div className="py-12 text-center">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">No FIRs found</p>
                    <p className="text-slate-500 text-sm">
                      Create a new FIR to get started
                    </p>
                  </div>
                )
                : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {filteredFirs.map((fir, idx) => {
                      const dateStr = fir?.incident_date
                        ? new Date(fir.incident_date).toLocaleDateString()
                        : "-";
                      return (
                        <motion.div
                          key={fir.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => navigate(`/police/firs/${fir.id}`)}
                          className="p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                                  {fir?.fir_number ?? "N/A"}
                                </h3>
                                <span
                                  className={cn(
                                    "px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1",
                                    getStatusColor(fir?.status),
                                  )}
                                >
                                  {getStatusIcon(fir?.status)}
                                  {fir?.status ?? "Unknown"}
                                </span>
                              </div>
                              <p className="text-sm text-slate-400 mb-2">
                                {fir?.offense_nature ?? "N/A"}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>📅 {dateStr}</span>
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <FileText className="w-5 h-5 text-emerald-400" />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
            </motion.div>

            {/* Quick Stats & Info */}
            <motion.div
              variants={itemVariants}
              className="glass-card p-8 rounded-xl border border-white/10 space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-xl font-semibold text-white">
                    Statistics
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-400">
                        Case Resolution
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {counts.total > 0
                          ? Math.round(
                            ((counts.total - counts.pending) / counts.total) *
                              100,
                          )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all"
                        style={{
                          width: `${
                            counts.total > 0
                              ? ((counts.total - counts.pending) /
                                counts.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-400">
                        Pending FIRs
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {counts.total > 0
                          ? Math.round((counts.pending / counts.total) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all"
                        style={{
                          width: `${
                            counts.total > 0
                              ? (counts.pending / counts.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Link to="/police/new-fir" className="w-full">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      File New FIR
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-3">
                <h3 className="text-sm font-semibold text-white">
                  Recent Activity
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{counts.total - counts.pending} cases resolved</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{counts.pending} pending cases</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>{counts.total} total FIRs filed</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Info Banner */}
          <motion.div
            variants={itemVariants}
            className="glass-card p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/20">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">
                  Secure Investigation Management
                </h3>
                <p className="text-sm text-slate-400">
                  All FIR records and investigation files are encrypted and
                  stored securely with blockchain verification. Track evidence,
                  manage cases, and maintain complete audit trails.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};
