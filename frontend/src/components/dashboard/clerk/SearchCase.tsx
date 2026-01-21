import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, User, Scale, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/layout/GlassWrapper";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type CaseResult = {
  id: string;
  case_number: string;
  title: string;
  unique_identifier: string;
  case_type: string;
  status: string;
  party_a_name: string;
  party_b_name: string;
  created_at: string;
  assigned_judge: {
    full_name: string;
  } | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  hearing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  verdict_pending: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  closed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  appealed: "bg-red-500/10 text-red-400 border-red-500/20",
};

export const SearchCase = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<CaseResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResult(null);
    setNotFound(false);

    try {
      // Search by case_number or unique_identifier
      const { data, error } = await supabase
        .from("cases")
        .select(`
          id,
          case_number,
          title,
          unique_identifier,
          case_type,
          status,
          party_a_name,
          party_b_name,
          created_at,
          assigned_judge:assigned_judge_id(full_name)
        `)
        .or(`case_number.ilike.%${searchQuery}%,unique_identifier.ilike.%${searchQuery}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSearchResult(data as unknown as CaseResult);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error("Error searching case:", error);
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getPartyLabels = (caseType: string) => {
    if (caseType === "criminal") {
      return { partyA: "Complainant", partyB: "Accused" };
    }
    return { partyA: "Plaintiff", partyB: "Defendant" };
  };

  return (
    <GlassCard className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700">
          <Search className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Search Case</h2>
          <p className="text-slate-400 mt-1">
            Find an existing case by Case ID or FIR Number
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1">
          <Input
            placeholder="Enter Case ID or FIR Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyUp={handleKeyPress}
            className="h-12 bg-white/5 border-white/10 backdrop-blur-sm text-white placeholder:text-slate-400"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20"
        >
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {notFound && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No Case Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              No case matches the ID "{searchQuery}". Please check the ID and try again.
            </p>
          </motion.div>
        )}

        {searchResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border rounded-lg overflow-hidden"
          >
            {/* Case Header */}
            <div className="p-4 bg-secondary/30 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{searchResult.title}</h3>
                    <p className="text-sm font-mono text-muted-foreground">
                      {searchResult.case_number}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    statusColors[searchResult.status] || statusColors.pending
                  )}
                >
                  {searchResult.status.replace("_", " ")}
                </Badge>
              </div>
            </div>

            {/* Case Details */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Case Type */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Case Type
                  </p>
                  <p className="font-medium capitalize">{searchResult.case_type}</p>
                </div>

                {/* FIR/Case ID */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    FIR ID / Unique Identifier
                  </p>
                  <p className="font-medium font-mono">
                    {searchResult.unique_identifier}
                  </p>
                </div>

                {/* Party A */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {getPartyLabels(searchResult.case_type).partyA}
                  </p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{searchResult.party_a_name}</p>
                  </div>
                </div>

                {/* Party B */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {getPartyLabels(searchResult.case_type).partyB}
                  </p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{searchResult.party_b_name}</p>
                  </div>
                </div>

                {/* Assigned Judge */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Assigned Judge
                  </p>
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-500" />
                    <p className="font-medium">
                      {searchResult.assigned_judge?.full_name || "Not Assigned"}
                    </p>
                  </div>
                </div>

              </div>

              {/* Filed Date */}
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Filed on{" "}
                  {new Date(searchResult.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {!searchResult && !notFound && !isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="p-4 rounded-full bg-muted/30 mb-4">
              <Search className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a Case ID or FIR Number to search
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};
