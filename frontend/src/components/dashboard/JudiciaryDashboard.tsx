import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { NyaySutraSidebar } from "./NyaySutraSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { CauseListItem, LiveCauseList } from "./LiveCauseList";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Transform database cases to CauseListItem format
const transformCaseToCauseListItem = (
  dbCase: {
    id: string;
    case_number: string;
    title: string;
    status: string;
    case_type: string;
  },
  index: number,
): CauseListItem => {
  const getCaseType = (caseType: string, title: string): string => {
    if (caseType === "criminal") return "Criminal Case";
    if (caseType === "civil") return "Civil Suit";
    if (title.toLowerCase().includes("writ")) return "Writ Petition";
    if (title.toLowerCase().includes("bail")) return "Bail Application";
    return "Miscellaneous";
  };

  const getStage = (status: string): string => {
    switch (status) {
      case "pending":
        return "Filing";
      case "active":
        return "Arguments";
      case "hearing":
        return "Hearing";
      case "verdict_pending":
        return "Reserved";
      default:
        return "Scheduled";
    }
  };

  const mapStatus = (
    status: string,
  ): "scheduled" | "in-progress" | "completed" | "adjourned" => {
    switch (status) {
      case "closed":
        return "completed";
      case "hearing":
        return "in-progress";
      case "appealed":
        return "adjourned";
      default:
        return "scheduled";
    }
  };

  return {
    id: dbCase.id,
    srNo: index + 1,
    caseNumber: dbCase.case_number,
    parties: dbCase.title,
    caseType: getCaseType(dbCase.case_type, dbCase.title),
    stage: getStage(dbCase.status),
    status: mapStatus(dbCase.status),
    time: undefined,
    isUrgent: false,
  };
};

// Mock data for judgment queue (this would come from DB in production)

export const JudiciaryDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [causeList, setCauseList] = useState<CauseListItem[]>([]);
  const [, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [notificationCount, setNotificationCount] = useState(0);

  const judgeName = profile?.full_name || "Judge";

  // Fetch notifications for this judge
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!profile?.id) return;

      try {
        // Fetch unread notifications for this user
        const { data: notifications, error } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", profile.id)
          .eq("is_read", false);

        if (error) throw error;

        setNotificationCount(notifications?.length || 0);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();

    // Poll for new notifications every 5 seconds
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  // Fetch real cases from database
  useEffect(() => {
    const fetchCases = async () => {
      try {
        // Get today's date in ISO format
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.toISOString();

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayEnd = tomorrow.toISOString();

        // Fetch cases with next hearing date today
        const { data: cases, error } = await supabase
          .from("cases")
          .select("id, case_number, title, status, case_type")
          .gte("next_hearing_date", todayStart)
          .lt("next_hearing_date", todayEnd)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (cases) {
          const transformedCases = cases.map((c, index) =>
            transformCaseToCauseListItem(c, index)
          );
          setCauseList(transformedCases);
        } else {
          setCauseList([]);
        }
      } catch (error) {
        console.error("Error fetching cases:", error);
        toast.error("Failed to load cases");
        setCauseList([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, []);

  const handleOpenCaseFile = useCallback((id: string) => {
    navigate(`/cases/${id}`);
  }, [navigate]);

  const handleVideoCall = useCallback((id: string) => {
    toast.info("Video call feature coming soon", {
      description: `Case ID: ${id}`,
    });
  }, []);

  const handlePassOrder = useCallback((id: string) => {
    toast.info("Pass order feature coming soon", {
      description: `Case ID: ${id}`,
    });
  }, []);

  // Filter cases based on search and status
  const filteredCases = causeList.filter((caseItem) => {
    const matchesSearch = searchQuery === "" ||
      caseItem.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.parties.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "all" ||
      caseItem.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Count by status
  const statusCounts = {
    active: causeList.filter((c) => c.status === "in-progress").length,
    pending: causeList.filter((c) => c.status === "scheduled").length,
    closed: causeList.filter((c) => c.status === "completed").length,
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar */}
      <NyaySutraSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <DashboardHeader
            judgeName={judgeName}
            notificationCount={notificationCount}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Main Grid */}
          <div className="grid grid-cols-1 gap-6">
            {/* Today's Case List Section */}
            <div className="space-y-4">
              {/* Header with Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white">
                      Today's Case List
                    </h2>
                    <p className="text-sm text-slate-400">
                      Today's scheduled hearings
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <svg
                      className="w-4 h-4 text-emerald-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-emerald-300">
                      {statusCounts.active} Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <svg
                      className="w-4 h-4 text-amber-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-amber-300">
                      {statusCounts.pending} Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-500/10 border border-slate-500/30">
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-slate-300">
                      {statusCounts.closed} Closed
                    </span>
                  </div>
                </div>
              </div>

              {/* Search and Filter Bar */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search by case number, title, or parties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-slate-950/50 border-slate-700 focus:bg-slate-950 focus:border-blue-600"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 h-10 rounded-md bg-slate-950/50 border border-slate-700 text-white text-sm hover:bg-slate-950 focus:bg-slate-950 focus:border-blue-600 cursor-pointer flex items-center gap-2"
                >
                  <option value="all">All Status</option>
                  <option value="in-progress">Active</option>
                  <option value="scheduled">Pending</option>
                  <option value="completed">Closed</option>
                </select>
              </div>

              {/* Live Cause List */}
              <LiveCauseList
                items={filteredCases}
                currentHearingId={null}
                onStartHearing={(id: string) => {
                  const caseItem = filteredCases.find((c) => c.id === id);
                  toast.success(`Hearing started for ${caseItem?.caseNumber}`, {
                    description: caseItem?.parties,
                  });
                }}
                onOpenCaseFile={handleOpenCaseFile}
                onVideoCall={handleVideoCall}
                onPassOrder={handlePassOrder}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
