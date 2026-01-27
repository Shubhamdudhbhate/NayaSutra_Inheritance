import { motion } from "framer-motion";
import {
  BarChart3,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Briefcase,
  Search,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NyaySutraSidebar } from "@/components/dashboard/NyaySutraSidebar";
import { RegisterCaseForm } from "@/components/dashboard/clerk/RegisterCaseForm";
import { SearchCase } from "@/components/dashboard/clerk/SearchCase1";
import { CaseManagementPanel } from "@/components/dashboard/clerk/CaseManagementPanel";

const ProfessionalDashboard = () => {
  const { profile } = useAuth();
  const { roleTheme } = useRole();
  const [manageCaseId, setManageCaseId] = useState("");
  const [activeCaseData, setActiveCaseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCaseToManage = async () => {
    if (!manageCaseId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('cases')
      .select('*, assigned_judge:assigned_judge_id(full_name)')
      .or(`case_number.eq.${manageCaseId},unique_identifier.eq.${manageCaseId}`)
      .maybeSingle();

    if (error || !data) {
      toast.error("Case not found");
      setActiveCaseData(null);
    } else {
      setActiveCaseData(data);
    }
    setIsLoading(false);
  };

  const getRoleTitle = () => {
    switch (profile?.role_category) {
      case "judiciary":
        return "Judiciary Dashboard";
      case "lawyer":
        return "Lawyer Dashboard";
      case "clerk":
        return "Clerk Dashboard";
      case "police":
        return "Police Dashboard";
      case "public_party":
        return "Case Tracking Portal";
      default:
        return "Dashboard";
    }
  };

  // Show Clerk-specific dashboard
  if (profile?.role_category === "clerk") {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        <NyaySutraSidebar />
        <main className="flex-1 ml-64 p-8">
          {/* Background Effects */}
          <div className="absolute inset-0 grid-background opacity-10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10"
          >
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-white flex items-center gap-3 mb-2">
                <Briefcase className="w-10 h-10 text-cyan-400" />
                Clerk Dashboard
              </h1>
              <p className="text-slate-400">
                Welcome back, <span className="font-semibold text-slate-200">{profile?.full_name}</span>
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-8 rounded-2xl border border-white/10"
            >
              <Tabs defaultValue="register" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/5 border border-white/10 p-1">
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Register Case
                </TabsTrigger>
                <TabsTrigger 
                  value="search"
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search Case
                </TabsTrigger>
                <TabsTrigger 
                  value="manage"
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Case Management
                </TabsTrigger>
              </TabsList>

              <TabsContent value="register" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <RegisterCaseForm />
                </motion.div>
              </TabsContent>

              <TabsContent value="search" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <SearchCase />
                </motion.div>
              </TabsContent>

              <TabsContent value="manage" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {!activeCaseData ? (
                    <div className="p-8 border border-cyan-500/30 rounded-xl bg-cyan-500/5 text-center space-y-4">
                      <Briefcase className="w-12 h-12 text-cyan-400 mx-auto" />
                      <h3 className="text-lg font-medium text-white">Load Case to Manage</h3>
                      <div className="flex max-w-md mx-auto gap-2">
                        <Input 
                          placeholder="Enter Case Number (e.g. CASE-2026-001)" 
                          value={manageCaseId}
                          onChange={(e) => setManageCaseId(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                        />
                        <Button 
                          onClick={fetchCaseToManage} 
                          disabled={isLoading}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                          {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Button 
                        variant="ghost" 
                        onClick={() => setActiveCaseData(null)} 
                        className="mb-4 text-cyan-400 hover:text-cyan-300"
                      >
                        ← Change Case
                      </Button>
                      <CaseManagementPanel caseData={activeCaseData} />
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
            </motion.div>
            </motion.div>
          </main>
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

  const stats = [
    {
      label: "Active Cases",
      value: "12",
      icon: <FileText className="w-5 h-5" />,
      color: "blue",
    },
    {
      label: "Pending Actions",
      value: "5",
      icon: <AlertCircle className="w-5 h-5" />,
      color: "amber",
    },
    {
      label: "Completed",
      value: "48",
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "emerald",
    },
    {
      label: "Team Members",
      value: "8",
      icon: <Users className="w-5 h-5" />,
      color: "purple",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <NyaySutraSidebar />
      <main className="flex-1 ml-64 p-8">
        {/* Background Effects */}
        <div className="absolute inset-0 grid-background opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10"
        >
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="mb-12"
          >
            <div className="flex items-end gap-4">
              <div>
                <h1 className="text-5xl font-bold text-white mb-2">
                  {getRoleTitle()}
                </h1>
                <p className="text-slate-400">
                  Welcome back, <span className="font-semibold text-slate-200">{profile?.full_name}</span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-4 gap-6 mb-12"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="glass-card p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-400`}
                >
                  {stat.icon}
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-3 gap-6"
        >
          {/* Recent Activity */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 glass-card p-6 rounded-xl border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">
                Recent Activity
              </h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "Case #2024-001 Updated",
                  time: "2 hours ago",
                  status: "completed",
                },
                {
                  title: "New evidence uploaded",
                  time: "4 hours ago",
                  status: "in-progress",
                },
                {
                  title: "Document reviewed",
                  time: "1 day ago",
                  status: "completed",
                },
              ].map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                >
                  <div>
                    <p className="text-white font-medium">{activity.title}</p>
                    <p className="text-xs text-slate-400">{activity.time}</p>
                  </div>
                  {activity.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            variants={itemVariants}
            className="glass-card p-6 rounded-xl border border-white/10 space-y-4"
          >
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Performance</h2>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">Case Completion</span>
                  <span className="text-sm font-semibold text-white">80%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">On-time Filings</span>
                  <span className="text-sm font-semibold text-white">95%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-11/12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">Documentation</span>
                  <span className="text-sm font-semibold text-white">72%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-slate-400 text-center">
                📊 Updated 2 hours ago
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          variants={itemVariants}
          className="mt-12 glass-card p-6 rounded-xl border border-blue-500/30 bg-blue-500/5"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">
                Enterprise-Grade Security
              </h3>
              <p className="text-sm text-slate-400">
                All your data is encrypted with blockchain verification and immutable audit trails.
                Your information is protected at the highest levels of security standards.
              </p>
            </div>
          </div>
        </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default ProfessionalDashboard;
