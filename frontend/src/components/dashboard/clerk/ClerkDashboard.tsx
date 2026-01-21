import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Search } from "lucide-react";
import { RegisterCaseForm } from "./RegisterCaseForm";
import { SearchCase } from "./SearchCase";
import { CaseManagementPanel } from "./CaseManagementPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/layout/GlassWrapper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const ClerkDashboard = () => {
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

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            Clerk Dashboard
          </h1>
          <p className="text-slate-400">
            Register new cases and manage case proceedings
          </p>
        </div>
      </motion.div>

      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/5 border border-white/10 backdrop-blur-lg">
          <TabsTrigger value="register" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Register Case</TabsTrigger>
          <TabsTrigger value="search" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Search Case</TabsTrigger>
          <TabsTrigger value="manage" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Case Management</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <RegisterCaseForm />
        </TabsContent>

        <TabsContent value="search">
          <SearchCase />
        </TabsContent>

        <TabsContent value="manage">
          {!activeCaseData ? (
            <GlassCard className="p-8 text-center space-y-6">
              <div className="p-4 rounded-full bg-blue-500/10 w-fit mx-auto">
                <Briefcase className="w-12 h-12 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Load Case to Manage</h3>
                <p className="text-muted-foreground mb-4">
                  Enter a Case Number or FIR ID to load and manage a case
                </p>
              </div>
              <div className="flex max-w-md mx-auto gap-3">
                <Input 
                  placeholder="Enter Case Number (e.g. CASE-2026-001)" 
                  value={manageCaseId}
                  onChange={(e) => setManageCaseId(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 backdrop-blur-sm"
                />
                <Button 
                  onClick={fetchCaseToManage} 
                  disabled={isLoading}
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20"
                >
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                </Button>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Managing Case: {activeCaseData.case_number}</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveCaseData(null)}
                  className="border-white/10 bg-white/5 hover:bg-white/10"
                >
                  Change Case
                </Button>
              </div>
              <CaseManagementPanel caseData={activeCaseData} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};