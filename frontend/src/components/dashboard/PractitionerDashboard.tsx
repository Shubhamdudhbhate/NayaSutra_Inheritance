import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Scale,
  Upload,
  FileText,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GlassCard } from "@/components/layout/GlassWrapper";
import { PendingSignatures } from "./PendingSignatures";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { UserNotifications } from "@/components/notifications/UserNotifications";
import { NotificationTab } from "@/components/notifications/NotificationTab";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Case = {
  id: string;
  case_number: string;
  title: string;
  status: string;
  created_at: string;
};

type UploadStatus = {
  caseId: string;
  caseTitle: string;
  fileName: string;
  status: "hashing" | "encrypting" | "ipfs" | "blockchain" | "complete";
  progress: number;
};

type PendingCase = {
  id: string;
  case_number: string;
  title: string;
  status: string;
  requested_at?: string;
};

export const PractitionerDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { roleTheme } = useRole();
  const [cases, setCases] = useState<Case[]>([]);
  const [pendingSignatures, setPendingSignatures] = useState<PendingCase[]>([]);
  const [uploadTrackers] = useState<UploadStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
      fetchPendingSignatures();
    }
  }, [profile?.id]);

  const fetchData = async () => {
    if (!profile?.id) return;

    try {
      // Fetch cases where user is assigned as lawyer
      const { data: casesData } = await supabase
        .from("cases")
        .select("id, case_number, title, status, created_at")
        .or(`lawyer_party_a_id.eq.${profile.id},lawyer_party_b_id.eq.${profile.id}`)
        .order("created_at", { ascending: false })
        .limit(10);

      setCases(casesData || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingSignatures = async () => {
    if (!profile?.id) return;

    try {
      // Fetch cases where this lawyer is assigned and case is active
      const { data: casesData } = await supabase
        .from("cases")
        .select("id, case_number, title, status, created_at")
        .or(`lawyer_party_a_id.eq.${profile.id},lawyer_party_b_id.eq.${profile.id}`)
        .in("status", ["active", "hearing", "verdict_pending"])
        .limit(10);

      if (casesData) {
        setPendingSignatures(
          casesData.map((c) => ({
            ...c,
            requested_at: c.created_at,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching pending signatures:", error);
    }
  };

  const handleLawyerSign = async (caseId: string, signature: string) => {
    // In a real app, this would update the database
    console.log("Lawyer signed case:", caseId, "with signature:", signature);
    
    // Remove from pending list
    setPendingSignatures((prev) => prev.filter((c) => c.id !== caseId));
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Scale className={cn("w-8 h-8", `text-${roleTheme.primary}`)} />
            Practitioner Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your cases and evidence uploads
          </p>
        </div>
        <div className="relative">
          <UserNotifications />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Tracker */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Upload className={cn("w-5 h-5", `text-${roleTheme.primary}`)} />
              Upload Tracker
            </h3>
          </div>

          {uploadTrackers.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No active uploads
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/courts")}
              >
                Start Upload
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {uploadTrackers.map((tracker, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-lg bg-secondary/30 border border-white/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{tracker.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {tracker.caseTitle}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {tracker.status}
                    </Badge>
                  </div>
                  <Progress value={tracker.progress} className="h-2" />
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Notifications Tab */}
        <NotificationTab />

        {/* Pending Signatures */}
        <PendingSignatures
          cases={pendingSignatures}
          role="lawyer"
          onSign={handleLawyerSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className={cn("w-5 h-5", `text-${roleTheme.primary}`)} />
              Recent Cases
            </h3>
          </div>

          {cases.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No cases assigned yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.slice(0, 5).map((caseItem) => (
                <motion.button
                  key={caseItem.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => navigate(`/cases/${caseItem.id}`)}
                  className="w-full p-3 rounded-lg bg-secondary/30 border border-white/5 hover:border-white/10 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">
                        {caseItem.title}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {caseItem.case_number}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        caseItem.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      )}
                    >
                      {caseItem.status}
                    </Badge>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* My Cases */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className={cn("w-5 h-5", `text-${roleTheme.primary}`)} />
            My Cases
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/courts")}
          >
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {cases.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No cases assigned yet
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/courts")}
            >
              Browse Courts
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cases.slice(0, 6).map((caseItem) => (
              <motion.button
                key={caseItem.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => navigate(`/cases/${caseItem.id}`)}
                className="p-4 rounded-lg bg-secondary/30 border border-white/5 hover:border-white/10 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-2">
                  <FileText className={cn("w-5 h-5", `text-${roleTheme.primary}/50`)} />
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      caseItem.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}
                  >
                    {caseItem.status}
                  </Badge>
                </div>
                <p className="font-medium text-sm group-hover:text-primary transition-colors mb-1">
                  {caseItem.title}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {caseItem.case_number}
                </p>
              </motion.button>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
