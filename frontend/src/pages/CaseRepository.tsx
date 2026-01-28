import { useEffect, useState } from "react";
import { FolderOpen, Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NyaySutraSidebar } from "@/components/dashboard/NyaySutraSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CaseCardWithActions } from "@/components/cases/CaseCardWithActions";
import { useNavigate } from "react-router-dom";

type Case = {
  id: string;
  case_number: string;
  title: string;
  status: string;
  created_at: string;
};

export default function CaseRepository() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (profile?.id) {
      fetchCases();
    }
  }, [profile?.id]);

  const fetchCases = async () => {
    if (!profile?.id) return;

    try {
      // Fetch all cases where user is assigned as lawyer
      const { data: casesData } = await supabase
        .from("cases")
        .select("id, case_number, title, status, created_at")
        .or("lawyer_party_a_id.eq." + profile.id + ",lawyer_party_b_id.eq." + profile.id)
        .order("created_at", { ascending: false });

      setCases(casesData || []);
    } catch (error) {
      console.error("Error fetching case repository:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCases = cases.filter((caseItem) => {
    const matchesSearch = searchQuery === "" ||
      caseItem.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || caseItem.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <NyaySutraSidebar />
        <div className="flex-1 flex flex-col min-w-0 ml-64">
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner size={48} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <NyaySutraSidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-64">
        <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Case Repository</h1>
                <p className="text-sm text-muted-foreground">All cases assigned to you</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/lawyer/notifications")}
              className="relative text-muted-foreground hover:text-foreground hover:bg-muted p-2"
            >
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Search and Filter */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="hearing">Hearing</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cases Grid */}
          {filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No cases found
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Cases assigned to you will appear here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCases.map((caseItem) => (
                <CaseCardWithActions
                  key={caseItem.id}
                  caseData={{
                    id: caseItem.id,
                    caseNumber: caseItem.case_number,
                    title: caseItem.title,
                    status: caseItem.status,
                    courtName: "Court",
                    presidingJudge: "Judge",
                    evidenceCount: 0,
                  }}
                  role="lawyer"
                />
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-8 flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <FolderOpen className="h-3 w-3" />
              {filteredCases.length} Cases
            </Badge>
            {statusFilter !== "all" && (
              <Badge variant="secondary">
                Filtered by {statusFilter}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
