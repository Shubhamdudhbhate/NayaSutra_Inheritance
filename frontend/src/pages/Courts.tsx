import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  FolderOpen,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { NyaySutraSidebar } from "@/components/dashboard/NyaySutraSidebar";
import { ScheduleHearingDialog } from "@/components/ScheduleHearingDialog";
import { cn } from "@/lib/utils";

type DbCase = {
  id: string;
  case_number: string;
  title: string;
  status: string;
  case_type: string;
  party_a_name: string;
  party_b_name: string;
  court_name: string | null;
  next_hearing_date: string | null;
  created_at: string;
  updated_at: string;
};

const Courts = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [cases, setCases] = useState<DbCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedCaseForScheduling, setSelectedCaseForScheduling] = useState<
    {
      id: string;
      case_number: string;
    } | null
  >(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Helper function to parse time string exactly as stored (YYYY-MM-DDTHH:mm:ss)
  const parseISTDateTime = (dateString: string): Date => {
    // The stored format is "YYYY-MM-DDTHH:mm:00" without timezone
    // We need to parse it as local time, not UTC
    // Extract the components and create a Date object treating it as local time
    const [datePart, timePart] = dateString.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes, seconds] = timePart.split(":").map(Number);

    // Create date in local timezone, then adjust to UTC for format() function
    // This preserves the exact time the user entered
    const localDate = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      seconds || 0,
    );
    return localDate;
  };

  const fetchCases = async () => {
    if (!profile?.id) {
      console.log("Profile ID not available yet");
      return;
    }

    try {
      console.log("Fetching assigned cases for judge ID:", profile.id);

      // Fetch ONLY cases assigned to this judge
      const { data, error } = await supabase
        .from("cases")
        .select("*,next_hearing_date")
        .eq("assigned_judge_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching cases:", error);
        throw error;
      }

      console.log("Cases assigned to judge:", data?.length);
      setCases(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [profile?.id]);

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.party_a_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.party_b_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: cases.length,
    active: cases.filter((c) => c.status === "active").length,
    pending:
      cases.filter((c) =>
        c.status === "pending" || c.status === "verdict_pending"
      ).length,
    closed: cases.filter((c) => c.status === "closed").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "closed":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "hearing":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "verdict_pending":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "hearing":
        return <CheckCircle2 className="w-4 h-4" />;
      case "pending":
      case "verdict_pending":
        return <Clock className="w-4 h-4" />;
      case "closed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <NyaySutraSidebar />

      <main className="flex-1 ml-64 p-8">
        {/* Header with Stats */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
            {/* Title & Action */}
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <FolderOpen className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Case Repository
                </h1>
                <p className="text-muted-foreground text-sm">
                  {stats.total} total cases • {stats.active} active
                </p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">
                  {stats.active} Active
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">
                  {stats.pending} Pending
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-white/10">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {stats.closed} Closed
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by case number, title, or parties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/30 border-white/10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] bg-secondary/30 border-white/10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="hearing">Hearing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verdict_pending">Verdict Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Cases List/Grid */}
        {filteredCases.length === 0
          ? (
            <div className="text-center py-16">
              <FolderOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {cases.length === 0
                  ? "No cases assigned yet"
                  : "No cases match your search"}
              </p>
            </div>
          )
          : (
            <div
              className={viewMode === "grid"
                ? "grid grid-cols-1 gap-4"
                : "space-y-3"}
            >
              {filteredCases.map((caseItem, index) => (
                <motion.div
                  key={caseItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="card-glass border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                              {caseItem.case_number}
                            </code>
                            <Badge
                              variant="outline"
                              className={cn(
                                getStatusColor(caseItem.status),
                                "flex items-center gap-1",
                              )}
                            >
                              {getStatusIcon(caseItem.status)}
                              {caseItem.status.charAt(0).toUpperCase() +
                                caseItem.status.slice(1).replace("_", " ")}
                            </Badge>
                          </div>

                          <h3 className="text-lg font-semibold text-foreground truncate mb-2">
                            {caseItem.title}
                          </h3>

                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="text-xs opacity-70">
                                Plaintiff:
                              </span>
                              <p className="font-medium text-foreground truncate">
                                {caseItem.party_a_name}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs opacity-70">
                                Defendant:
                              </span>
                              <p className="font-medium text-foreground truncate">
                                {caseItem.party_b_name}
                              </p>
                            </div>
                          </div>

                          {caseItem.court_name && (
                            <p className="text-xs text-muted-foreground mt-2">
                              <span className="opacity-70">Court:</span>{" "}
                              {caseItem.court_name}
                            </p>
                          )}

                          {caseItem.next_hearing_date && (
                            <div className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-blue-300 font-semibold mb-1">
                                📅 Next Hearing:
                              </p>
                              <p className="text-sm text-blue-200 font-medium">
                                {format(
                                  parseISTDateTime(caseItem.next_hearing_date),
                                  "EEEE, d MMMM yyyy  hh:mm:ss a",
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCaseForScheduling({
                                id: caseItem.id,
                                case_number: caseItem.case_number,
                              });
                              setScheduleDialogOpen(true);
                            }}
                            className="gap-1.5 h-8"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-xs">
                              Schedule
                            </span>
                          </Button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cases/${caseItem.id}`);
                            }}
                            className="cursor-pointer hover:text-primary transition-colors"
                          >
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground mt-4 border-t border-border/50 pt-3">
                        Updated:{" "}
                        {new Date(caseItem.updated_at).toLocaleDateString(
                          "en-IN",
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

        {/* Schedule Hearing Dialog */}
        <ScheduleHearingDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          caseId={selectedCaseForScheduling?.id || ""}
          caseNumber={selectedCaseForScheduling?.case_number || ""}
          onSuccess={() => {
            fetchCases();
            setScheduleDialogOpen(false);
          }}
        />
      </main>
    </div>
  );
};

export default Courts;
