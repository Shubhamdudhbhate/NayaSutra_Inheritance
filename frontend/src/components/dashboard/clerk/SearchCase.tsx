import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, User, Scale, AlertCircle, Loader2, Briefcase, ArrowLeft, Calendar, ShieldAlert, ShieldCheck, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/layout/GlassWrapper";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getFIRById } from "@/services/policeService";

export type CaseResult = {
  id: string;
  case_number: string;
  title: string;
  case_type: string;
  status: string;
  party_a_name: string;
  party_b_name: string;
  created_at: string;
  fir_id?: string;
  is_on_chain: boolean;
  on_chain_case_id: string;
  assigned_judge?: {
    full_name: string;
  };
};

interface SearchCaseProps {
  onSelectCase?: (caseData: CaseResult) => Promise<void>;
  showMyCasesOnly?: boolean;
}

// Case Card Component
const CaseCard = ({ caseData }: { caseData: CaseResult }) => {
  const statusColors = {
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    closed: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    archived: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  const getPartyLabels = (caseType: string) => {
    switch (caseType?.toLowerCase()) {
      case "civil":
        return { a: "Plaintiff", b: "Defendant" };
      case "criminal":
        return { a: "Complainant", b: "Accused" };
      default:
        return { a: "Party A", b: "Party B" };
    }
  };

  const partyLabels = getPartyLabels(caseData.case_type);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">{caseData.title}</h3>
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="font-mono text-blue-200 border-blue-500/30 bg-blue-500/10">
              {caseData.case_number}
            </Badge>
            <Badge className={cn(statusColors[caseData.status as keyof typeof statusColors] || "bg-gray-500/10 text-gray-400 border-gray-500/20")}>
              {caseData.status.replace("_", " ").toUpperCase()}
            </Badge>
            {caseData.is_on_chain && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">
                <ShieldCheck className="w-3 h-3 mr-1" /> Blockchain Verified
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Filed</p>
          <p className="text-sm text-slate-300">{new Date(caseData.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-500">{partyLabels.a}:</span>
            <span className="text-sm text-white font-medium">{caseData.party_a_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-500">{partyLabels.b}:</span>
            <span className="text-sm text-white font-medium">{caseData.party_b_name}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500">Type:</span>
            <span className="text-sm text-white capitalize">{caseData.case_type}</span>
          </div>
          {caseData.assigned_judge && (
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500">Judge:</span>
              <span className="text-sm text-white">{caseData.assigned_judge.full_name}</span>
            </div>
          )}
        </div>
      </div>

      {caseData.fir_id && (
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-500">FIR ID:</span>
            <span className="text-xs font-mono text-emerald-400">{caseData.fir_id}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const SearchCase = ({ onSelectCase, showMyCasesOnly = false }: SearchCaseProps = {}) => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<CaseResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [myCases, setMyCases] = useState<CaseResult[]>([]);
  const [loadingMyCases, setLoadingMyCases] = useState(false);
  const [showMyCases] = useState(showMyCasesOnly);
  const [selectedCase, setSelectedCase] = useState<CaseResult | null>(null);
  const [linkedFIR, setLinkedFIR] = useState<any>(null);
  const [loadingFIR, setLoadingFIR] = useState(false);

  // Fetch clerk's cases
  useEffect(() => {
    if (showMyCasesOnly && profile?.id) {
      fetchMyCases();
    }
  }, [showMyCasesOnly, profile?.id]);

  // Fetch my cases when switching to My Cases view
  useEffect(() => {
    if (showMyCases && profile?.id) {
      fetchMyCases();
    }
  }, [showMyCases, profile?.id]);

  const fetchMyCases = async () => {
    if (!profile?.id) return;
    
    setLoadingMyCases(true);
    try {
      const { data, error } = await supabase
        .from("cases")
        .select(`
          id,
          case_number,
          title,
          case_type,
          status,
          party_a_name,
          party_b_name,
          created_at,
          fir_id,
          is_on_chain,
          on_chain_case_id,
          assigned_judge:assigned_judge_id(full_name)
        `)
        .eq("clerk_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setMyCases((data as unknown as CaseResult[]) || []);
    } catch (error) {
      console.error("Error fetching my cases:", error);
    } finally {
      setLoadingMyCases(false);
    }
  };

  // Handle case selection and FIR fetching
  const handleCaseClick = async (caseData: CaseResult) => {
    if (showMyCasesOnly) {
      // In My Cases mode, show details in modal
      setSelectedCase(caseData);
      setLinkedFIR(null);
      
      // Fetch linked FIR if exists
      if (caseData.fir_id) {
        setLoadingFIR(true);
        try {
          const firData = await getFIRById(caseData.fir_id);
          setLinkedFIR(firData);
        } catch (error) {
          console.error("Failed to fetch FIR", error);
          setLinkedFIR(null);
        } finally {
          setLoadingFIR(false);
        }
      }
    } else {
      // In search mode, use the parent handler
      onSelectCase?.(caseData);
    }
  };

  const handleBackToList = () => {
    setSelectedCase(null);
    setLinkedFIR(null);
  };

  const handleManageCase = () => {
    if (selectedCase) {
      // Directly go to manage mode, skip details view
      onSelectCase?.(selectedCase);
      // Also set view mode to manage directly
      setSelectedCase(null);
      setLinkedFIR(null);
    }
  };

  // Filter my cases based on search query
  const filteredMyCases = myCases.filter((caseItem: CaseResult) => 
    searchQuery.trim() === "" || 
    caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    caseItem.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (caseItem.fir_id && caseItem.fir_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResult(null);
    setNotFound(false);

    try {
      // Search by case_number, fir_id, or title
      // Handle UUID vs string comparison properly
      const { data, error } = await supabase
        .from("cases")
        .select(`
          id,
          case_number,
          title,
          case_type,
          status,
          party_a_name,
          party_b_name,
          created_at,
          fir_id,
          is_on_chain,
          on_chain_case_id,
          assigned_judge:assigned_judge_id(full_name)
        `)
        .or(`case_number.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`)
        .limit(1)
        .maybeSingle();

      // If no result from case_number/title search, try exact FIR ID match
      let finalData = data;
      if (!data && !error) {
        const { data: firData, error: firError } = await supabase
          .from("cases")
          .select(`
            id,
            case_number,
            title,
            case_type,
            status,
            party_a_name,
            party_b_name,
            created_at,
            fir_id,
            is_on_chain,
            on_chain_case_id,
            assigned_judge:assigned_judge_id(full_name)
          `)
          .eq("fir_id", searchQuery.trim())
          .maybeSingle();

        if (!firError) {
          finalData = firData;
        }
      }

      if (error || (!finalData && !error)) {
        throw error || new Error("No case found");
      }

      if (finalData) {
        setSearchResult(finalData as unknown as CaseResult);
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

  return (
    <GlassCard className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700">
          <Search className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">{showMyCasesOnly ? "My Cases" : "Search Case"}</h2>
          <p className="text-slate-400 mt-1">
            {showMyCasesOnly 
              ? "View and search all cases registered by you" 
              : "Find an existing case by Case ID, FIR Number, or Case Title"
            }
          </p>
        </div>
      </div>

      {/* Search Input - Always show search bar */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1">
          <Input
            placeholder={showMyCasesOnly ? "Search your cases by title, case number, or FIR..." : "Enter Case ID, FIR Number, or Case Title..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyUp={handleKeyPress}
            className="h-12 bg-white/5 border-white/10 backdrop-blur-sm text-white placeholder:text-slate-400"
          />
        </div>
        {!showMyCasesOnly && (
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
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {/* Case Details Modal (for My Cases) */}
        {showMyCases && selectedCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleBackToList}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Case Details</h2>
                  <Button variant="ghost" onClick={handleBackToList} className="text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{selectedCase.title}</h3>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-blue-200 border-blue-500/30 bg-blue-500/10">
                        {selectedCase.case_number}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">{selectedCase.status.replace("_", " ")}</Badge>
                      {selectedCase.is_on_chain && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Blockchain Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={handleManageCase} 
                    className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                  >
                    Manage Case Proceedings
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Parties</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                        <User className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-xs text-slate-500">Party A</p>
                          <p className="font-medium text-white">{selectedCase.party_a_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                        <User className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="text-xs text-slate-500">Party B</p>
                          <p className="font-medium text-white">{selectedCase.party_b_name}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Legal Details</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Scale className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300">Type: <span className="text-white capitalize">{selectedCase.case_type}</span></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Gavel className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300">Judge: <span className="text-white">{selectedCase.assigned_judge?.full_name || "Pending Assignment"}</span></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300">Filed: <span className="text-white">{new Date(selectedCase.created_at).toLocaleDateString()}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linked FIR Section */}
                <div className="border-t border-white/10 pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldAlert className="w-6 h-6 text-emerald-400" />
                    <h4 className="text-lg font-semibold text-white">Linked Police Record (FIR)</h4>
                  </div>

                  {loadingFIR ? (
                    <div className="py-8 text-center text-slate-400">Loading FIR details...</div>
                  ) : linkedFIR ? (
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                      <div className="space-y-4">
                        <div>
                          <p className="text-slate-500 mb-1">FIR Number</p>
                          <p className="text-lg font-mono text-white">{linkedFIR.fir_number}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">Police Station</p>
                          <p className="text-white">{linkedFIR.police_station}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-slate-500 mb-1">Offense</p>
                          <p className="text-white bg-red-500/10 inline-block px-2 py-1 rounded border border-red-500/20">
                            {linkedFIR.offense_nature}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">Incident Date</p>
                          <div className="flex items-center gap-2 text-white">
                            <Calendar className="w-4 h-4" />
                            {new Date(linkedFIR.incident_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2 mt-4 pt-4 border-t border-white/10">
                          <p className="text-slate-500 mb-2">Description</p>
                          <p className="text-slate-300 leading-relaxed">{linkedFIR.description}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center bg-white/5 rounded-lg border border-dashed border-white/20">
                      <p className="text-slate-400">No linked FIR found for this case.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* My Cases List */}
        {showMyCases && !selectedCase && (
          <div className="space-y-4">
            {loadingMyCases ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">Loading Cases</h3>
                <p className="text-sm text-muted-foreground">
                  Fetching cases registered by you...
                </p>
              </motion.div>
            ) : myCases.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="p-4 rounded-full bg-muted/30 mb-4">
                  <Briefcase className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium mb-1">No Cases Found</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't registered any cases yet.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  {searchQuery.trim() 
                    ? `Found ${filteredMyCases.length} case${filteredMyCases.length !== 1 ? 's' : ''} matching "${searchQuery}"`
                    : `Showing all ${myCases.length} case${myCases.length !== 1 ? 's' : ''} registered by you`
                  }
                </p>
                {(searchQuery.trim() ? filteredMyCases : myCases).map((caseItem: CaseResult, index: number) => (
                  <motion.div
                    key={caseItem.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleCaseClick(caseItem)}
                  >
                    <CaseCard caseData={caseItem} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {!showMyCases && notFound && (
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
              No case matches "{searchQuery}". Please check the ID, FIR Number, or title and try again.
            </p>
          </motion.div>
        )}

        {searchResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onSelectCase?.(searchResult)}
          >
            <CaseCard caseData={searchResult} />
          </motion.div>
        )}

        {!showMyCases && !searchResult && !notFound && !isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="p-4 rounded-full bg-muted/30 mb-4">
              <Search className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a Case ID, FIR Number, or Case Title to search
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};
