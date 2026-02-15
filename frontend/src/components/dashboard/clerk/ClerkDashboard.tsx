import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, ArrowLeft, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationAlerts } from "@/hooks/useNotificationAlerts";
// Components
import { RegisterCaseForm } from "./RegisterCaseForm";
import { SearchCase, CaseResult } from "./SearchCase"; 
import { CaseManagementPanel } from "./CaseManagementPanel";
import { NotificationTab } from "@/components/notifications/NotificationTab";


export const ClerkDashboard = () => {
  const [activeTab, setActiveTab] = useState("cases");
  const { profile } = useAuth();
  
  // Real-time notification alerts
  const { notificationCount, hasNewNotification } = useNotificationAlerts({
    userId: profile?.id,
    enabled: true,
    showToasts: true,
  });
  
  // Navigation State
  const [viewMode, setViewMode] = useState<"list" | "manage">("list");
  const [selectedCase, setSelectedCase] = useState<CaseResult & { fir_id?: string } | null>(null);

  // Handler for when a new case is created
  const handleCaseCreated = (newCase: any) => {
    setSelectedCase(newCase);
    setViewMode("manage");
    setActiveTab("cases");
  };

  // Handlers
  const handleCaseSelect = async (caseData: CaseResult & { fir_id?: string }) => {
    setSelectedCase(caseData);
    // Directly go to manage view, skip details
    setViewMode("manage");
  };

  const handleBack = () => {
    setViewMode("list");
    setSelectedCase(null);
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("notifications")}
          className={`relative text-slate-400 hover:text-white hover:bg-white/10 p-2 ${
            hasNewNotification ? "animate-bounce" : ""
          }`}
        >
          <Bell className={`w-5 h-5 ${hasNewNotification ? "text-amber-400" : ""}`} />
          {notificationCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white animate-pulse">
              {notificationCount > 9 ? "9+" : notificationCount}
            </Badge>
          )}
        </Button>
      </motion.div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setViewMode("list"); }} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8 bg-white/5 border border-white/10 backdrop-blur-lg">
          <TabsTrigger value="register">Register Case</TabsTrigger>
          <TabsTrigger value="cases">My Cases</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <RegisterCaseForm onCaseCreated={handleCaseCreated} />
        </TabsContent>

        <TabsContent value="cases">
          {viewMode === "list" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SearchCase onSelectCase={handleCaseSelect} showMyCasesOnly={true} />
            </motion.div>
          )}

          {viewMode === "manage" && selectedCase && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-4">
                <Button variant="ghost" onClick={handleBack} className="text-slate-400 hover:text-white pl-0">
                  <ArrowLeft className="w-5 h-5 mr-2" /> Back to List
                </Button>
              </div>
              <CaseManagementPanel 
                caseData={selectedCase as any} 
                onCaseUpdate={() => console.log("Case Updated")}
              />
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
