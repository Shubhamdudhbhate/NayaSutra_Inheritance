import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Filter,
  Search,
  Play,
  Pause,
  FileText,
  Video,
  Gavel,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Users,
  Scale,
} from "lucide-react";
import { NyaySutraSidebar } from "@/components/dashboard/NyaySutraSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CauseItem {
  id: string;
  srNo: number;
  caseNumber: string;
  parties: string;
  caseType: string;
  stage: string;
  status: "waiting" | "in-progress" | "completed" | "adjourned";
  scheduledTime?: string;
  priority?: "urgent" | "normal";
}

const CauseList = () => {
  const navigate = useNavigate();
  const { profile } = useAuth(); // Add profile from useAuth
  const [causeList, setCauseList] = useState<CauseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentHearingId, setCurrentHearingId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchCauseList();
  }, [profile?.id]); // Add profile.id dependency

  const fetchCauseList = async () => {
    if (!profile?.id) {
      console.log("Judge profile not available");
      return;
    }

    try {
      // Fetch only cases assigned to this judge
      const { data: cases, error } = await supabase
        .from("cases")
        .select("id, case_number, title, status, case_type, party_a_name, party_b_name")
        .eq("assigned_judge_id", profile.id) // Only this judge's cases
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedList: CauseItem[] = (cases || []).map((c, index) => ({
        id: c.id,
        srNo: index + 1,
        caseNumber: c.case_number,
        parties: `${c.party_a_name} vs. ${c.party_b_name}`,
        caseType: c.case_type === "criminal" ? "Criminal" : "Civil",
        stage: c.status === "hearing" ? "Arguments" : c.status === "active" ? "Evidence" : "Preliminary",
        status: c.status === "hearing" ? "in-progress" : c.status === "closed" ? "completed" : "waiting",
        priority: "normal",
      }));

      setCauseList(formattedList);
    } catch (error) {
      console.error("Error fetching cause list:", error);
      toast.error("Failed to load cause list");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartHearing = (id: string) => {
    setCurrentHearingId(id);
    setCauseList(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: "in-progress" as const } : item
      )
    );
    toast.success("Hearing started");
  };

  const handleEndHearing = (id: string) => {
    setCurrentHearingId(null);
    setCauseList(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: "completed" as const } : item
      )
    );
    toast.success("Hearing completed");
  };

  const filteredList = causeList.filter(item => {
    const matchesSearch = 
      item.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.parties.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: causeList.length,
    waiting: causeList.filter(c => c.status === "waiting").length,
    inProgress: causeList.filter(c => c.status === "in-progress").length,
    completed: causeList.filter(c => c.status === "completed").length,
  };

  const getStatusBadge = (status: CauseItem["status"]) => {
    switch (status) {
      case "in-progress":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">Live</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Disposed</Badge>;
      case "adjourned":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Adjourned</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Waiting</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <NyaySutraSidebar />
      
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Scale className="h-8 w-8 text-primary" />
              Today's Cause List
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Court Hours: 10:00 AM - 4:00 PM</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="card-glass border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Cases</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-glass border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Timer className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.waiting}</p>
                <p className="text-sm text-muted-foreground">Waiting</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-glass border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <Play className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-glass border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <CheckCircle2 className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-glass border-border/50 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by case number or party name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48 bg-muted/50 border-border">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cases</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="adjourned">Adjourned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cause List Table */}
        <Card className="card-glass border-border/50">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-lg font-semibold">Case Listings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Scale className="h-12 w-12 mb-4 opacity-50" />
                <p>No cases found</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <AnimatePresence>
                  {filteredList.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "transition-all duration-300",
                        currentHearingId === item.id && "bg-emerald-500/5 ring-1 ring-emerald-500/20"
                      )}
                    >
                      <div
                        className="flex items-center gap-4 p-4 hover:bg-muted/30 cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                      >
                        <span className="w-12 text-center font-mono text-muted-foreground">
                          {item.srNo.toString().padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">{item.caseNumber}</span>
                            {item.priority === "urgent" && (
                              <AlertTriangle className="h-4 w-4 text-urgent" />
                            )}
                            {getStatusBadge(item.status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{item.parties}</p>
                        </div>
                        <div className="text-right mr-4">
                          <p className="text-sm font-medium text-foreground">{item.caseType}</p>
                          <p className="text-xs text-muted-foreground">{item.stage}</p>
                        </div>
                        {item.scheduledTime && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.scheduledTime}
                          </Badge>
                        )}
                        <div className="flex items-center gap-2">
                          {currentHearingId === item.id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEndHearing(item.id);
                              }}
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              End
                            </Button>
                          ) : item.status === "waiting" ? (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartHearing(item.id);
                              }}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cases/${item.id}`);
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Video className="h-4 w-4" />
                          </Button>
                          {expandedRow === item.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedRow === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-muted/20 border-t border-border/30"
                          >
                            <div className="p-4 grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Parties</p>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-primary" />
                                  <span className="text-sm">{item.parties}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Current Stage</p>
                                <p className="text-sm font-medium">{item.stage}</p>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm">
                                  <Gavel className="h-4 w-4 mr-2" />
                                  Pass Order
                                </Button>
                                <Button variant="default" size="sm" onClick={() => navigate(`/cases/${item.id}`)}>
                                  Open Full File
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CauseList;
