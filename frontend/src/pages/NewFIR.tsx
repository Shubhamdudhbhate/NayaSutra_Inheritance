import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { createFIR } from "@/services/policeService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, FileText, AlertCircle } from "lucide-react";

const NewFIR = () => {
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      const created = await createFIR(payload);
      toast.success("FIR created successfully!");
      navigate(`/police/firs/${created.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create FIR");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 grid-background opacity-10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto px-6 py-12"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4 text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <h1 className="text-5xl font-bold text-white flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            Register New FIR
          </h1>
          <p className="text-slate-400">
            File a new First Information Report for investigation tracking
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-8 rounded-xl border border-white/10"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Section */}
            <motion.div
              variants={itemVariants}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                FIR Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    FIR Number *
                  </label>
                  <Input
                    name="fir_number"
                    value={form.fir_number}
                    onChange={handleChange}
                    placeholder="e.g., FIR/2026/001"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Police Station *
                  </label>
                  <Input
                    name="police_station"
                    value={form.police_station}
                    onChange={handleChange}
                    placeholder="Police station name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>
            </motion.div>

            {/* Complainant Details */}
            <motion.div
              variants={itemVariants}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-400" />
                Complainant Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Name *
                  </label>
                  <Input
                    name="informant_name"
                    value={form.informant_name}
                    onChange={handleChange}
                    placeholder="Full name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contact Number *
                  </label>
                  <Input
                    name="informant_contact"
                    value={form.informant_contact}
                    onChange={handleChange}
                    placeholder="Phone number"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Address (Optional)
                  </label>
                  <Input
                    name="informant_address"
                    placeholder="Address"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </motion.div>

            {/* Incident Information */}
            <motion.div
              variants={itemVariants}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Incident Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Incident Date & Time *
                  </label>
                  <Input
                    name="incident_date"
                    value={form.incident_date}
                    onChange={handleChange}
                    type="datetime-local"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Incident Place *
                  </label>
                  <Input
                    name="incident_place"
                    value={form.incident_place}
                    onChange={handleChange}
                    placeholder="Location of incident"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>
            </motion.div>

            {/* Offense Details */}
            <motion.div
              variants={itemVariants}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Offense Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Offense Type *
                  </label>
                  <Input
                    name="offense_nature"
                    value={form.offense_nature}
                    onChange={handleChange}
                    placeholder="Type of offense"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    BNS Section
                  </label>
                  <Input
                    name="bns_section"
                    value={form.bns_section}
                    onChange={handleChange}
                    placeholder="e.g., Section 302"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </motion.div>

            {/* People Involved */}
            <motion.div
              variants={itemVariants}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                People Involved
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Victim Name *
                  </label>
                  <Input
                    name="victim_name"
                    value={form.victim_name}
                    onChange={handleChange}
                    placeholder="Victim's name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Accused Name (If Known)
                  </label>
                  <Input
                    name="accused_name"
                    value={form.accused_name}
                    onChange={handleChange}
                    placeholder="Accused's name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              variants={itemVariants}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Description & Summary
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description / Evidence Summary
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Detailed description of the incident and evidence..."
                  className="w-full h-32 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex gap-4 pt-6 border-t border-white/10"
            >
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Submit FIR
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="flex-1 border-slate-600 hover:border-slate-400 text-slate-200 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </motion.div>
          </form>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          variants={itemVariants}
          className="mt-8 glass-card p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <AlertCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">
                Important Information
              </h3>
              <p className="text-sm text-slate-400">
                All FIR information is securely stored and encrypted. Ensure all details are accurate before submission.
                This FIR can be updated after filing if necessary.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NewFIR;
