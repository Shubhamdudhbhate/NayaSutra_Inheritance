import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FilePlus, Loader2, Search as SearchIcon, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GlassCard } from "@/components/layout/GlassWrapper";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- IMPORTS ---
import { clerkCreateCase } from "@/utils/BlockChain_Interface/clerk";
// NOTE: Ensure this path matches where you keep your service
import { getFIRByNumber } from "@/services/policeService"; 

const caseFormSchema = z.object({
  title: z.string().min(3, "Case title must be at least 3 characters").max(200),
  firIdInput: z.string().optional(), // Made optional because logic handles validation
  caseType: z.enum(["criminal", "civil"]),
  partyAName: z.string().min(2, "Party name must be at least 2 characters").max(100),
  partyBName: z.string().min(2, "Party name must be at least 2 characters").max(100),
  assignedJudgeId: z.string().optional(),
  lawyerPartyAId: z.string().optional(),
  lawyerPartyBId: z.string().optional(),
  description: z.string().optional(),
});

type CaseFormData = z.infer<typeof caseFormSchema>;

type Profile = {
  id: string;
  full_name: string;
  role_category: string;
  unique_id: string | null;
};

// Type for the fetched FIR data
type VerifiedFIR = {
  id: string; // UUID
  fir_number: string;
  police_station: string;
  accused_name: string;
  offense_nature: string;
  incident_date: string;
};

export const RegisterCaseForm = () => {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  
  // Data State
  const [judges, setJudges] = useState<Profile[]>([]);
  const [lawyers, setLawyers] = useState<Profile[]>([]);
  
  // FIR Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedFir, setVerifiedFir] = useState<VerifiedFIR | null>(null);
  
  // Search State
  const [judgeSearch, setJudgeSearch] = useState("");
  const [lawyerASearch, setLawyerASearch] = useState("");
  const [lawyerBSearch, setLawyerBSearch] = useState("");
  const [judgeOpen, setJudgeOpen] = useState(false);
  const [lawyerAOpen, setLawyerAOpen] = useState(false);
  const [lawyerBOpen, setLawyerBOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger, // Used to trigger validation manually
    formState: { errors },
  } = useForm<CaseFormData>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      caseType: "criminal",
    },
  });

  const caseType = watch("caseType");
  const firIdInput = watch("firIdInput"); // Watch the input for verification logic
  const selectedJudgeId = watch("assignedJudgeId");
  const selectedLawyerAId = watch("lawyerPartyAId");
  const selectedLawyerBId = watch("lawyerPartyBId");

  // Fetch Personnel
useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        // FIX 1: Removed 'unique_id' from selection
        // FIX 2: Changed 'judiciary' to 'judge' to match Enum
        const { data: judgesData, error: judgeError } = await supabase
          .from("profiles")
          .select("id, full_name, role_category") 
          .eq("role_category", "judge"); // Corrected Enum Value

        // FIX 2: Changed 'legal_practitioner' to 'lawyer' to match Enum
        const { data: lawyersData, error: lawyerError } = await supabase
          .from("profiles")
          .select("id, full_name, role_category")
          .eq("role_category", "lawyer"); // Corrected Enum Value

        if (judgeError) console.error("Judge Fetch Error:", judgeError);
        if (lawyerError) console.error("Lawyer Fetch Error:", lawyerError);

        // Explicitly cast to Profile[] to resolve the type confusion from the error
        setJudges((judgesData as Profile[]) || []);
        setLawyers((lawyersData as Profile[]) || []);
      } catch (error) {
        console.error("Error fetching personnel:", error);
      }
    };
    fetchPersonnel();
  }, []);

  const getPartyLabels = () => {
    if (caseType === "criminal") {
      return { partyA: "Complainant", partyB: "Accused" };
    }
    return { partyA: "Plaintiff", partyB: "Defendant" };
  };

  const { partyA, partyB } = getPartyLabels();

  // Helper filters
  const filteredJudges = judges.filter((judge) =>
    (judge.full_name || "").toLowerCase().includes(judgeSearch.toLowerCase())
  );
  const filteredLawyersA = lawyers.filter((lawyer) =>
    (lawyer.full_name || "").toLowerCase().includes(lawyerASearch.toLowerCase())
  );
  const filteredLawyersB = lawyers.filter((lawyer) =>
    (lawyer.full_name || "").toLowerCase().includes(lawyerBSearch.toLowerCase())
  );

  const getSelectedName = (id: string | undefined, list: Profile[]) => {
    if (!id) return null;
    return list.find((item) => item.id === id)?.full_name || null;
  };

  // --- NEW: FIR Verification Logic ---
  const handleVerifyFir = async () => {
    if (!firIdInput) {
      toast.error("Please enter an FIR Number first");
      return;
    }

    setIsVerifying(true);
    setVerifiedFir(null);

    try {
      // Use your existing service function or route here
      const firData = await getFIRByNumber(firIdInput);

      if (firData) {
        setVerifiedFir(firData as unknown as VerifiedFIR);
        toast.success("FIR Verified Successfully!");
        // Auto-fill accused name if empty
        setValue("partyBName", firData.accused_name || "Unknown");
      } else {
        toast.error("FIR not found. Please check the ID.");
      }
    } catch (error) {
      console.error("Verification failed", error);
      toast.error("Failed to verify FIR.");
    } finally {
      setIsVerifying(false);
    }
  };

  // --- MAIN SUBMIT LOGIC ---
  const onSubmit = async (data: CaseFormData) => {
    if (!profile?.id) {
      toast.error("You must be logged in to register a case");
      return;
    }

    // Validation: Criminal cases MUST have a verified FIR linked
    if (data.caseType === "criminal" && !verifiedFir) {
      toast.error("Criminal cases require a verified FIR. Please click 'Verify'.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. WEB3: CREATE ON BLOCKCHAIN
      setLoadingStep("Requesting Wallet Signature...");
      
      const chainMetaData = JSON.stringify({
        desc: data.description || "",
        type: data.caseType,
        partyA: data.partyAName,
        partyB: data.partyBName
      });

      // Pass FIR ID if verified, else use "CIVIL" or similar placeholder
      const firIdForChain = verifiedFir ? verifiedFir.fir_number : "CIVIL-NA";

      const { txHash, caseId } = await clerkCreateCase(
        data.title, 
        firIdForChain, 
        chainMetaData
      );

      toast.success(`Case created on Blockchain! ID: ${caseId}`);

      // 2. WEB2: PREPARE SUPABASE PAYLOAD
      setLoadingStep("Syncing with Database...");

      // Description helper
      const descriptionWithFir = verifiedFir 
        ? `Linked FIR: ${verifiedFir.fir_number}\nStation: ${verifiedFir.police_station}\n\n${data.description || ""}`
        : data.description || "";
      const clerkId = profile.id;
      const supabasePayload = {
        case_number: "", 
        title: data.title,
        case_type: data.caseType,
        party_a_name: data.partyAName,
        party_b_name: data.partyBName,
        
        assigned_judge_id: data.assignedJudgeId ? data.assignedJudgeId : null,
        lawyer_party_a_id: data.lawyerPartyAId ? data.lawyerPartyAId : null,
        lawyer_party_b_id: data.lawyerPartyBId ? data.lawyerPartyBId : null,
        
        description: descriptionWithFir,
        created_by: profile.id,
        clerk_id: clerkId,
        // Blockchain Fields
        blockchain_tx_hash: txHash,
        on_chain_case_id: caseId,
        is_on_chain: true,

        // NEW: Foreign Key Link
        fir_id: verifiedFir ? verifiedFir.id : null 
      };

      console.log("Sending Payload:", supabasePayload);

      const { error } = await supabase
        .from("cases")
        .insert(supabasePayload as any);

      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      toast.success("Case registered successfully in System!");
      
      reset();
      setVerifiedFir(null);
      setJudgeSearch("");
      setLawyerASearch("");
      setLawyerBSearch("");

    } catch (error: any) {
      console.error("Error registering case:", error);
      if (error.code === "ACTION_REJECTED" || error.message?.includes("user rejected")) {
        toast.error("Transaction rejected by wallet.");
      } else {
        toast.error(error.message || "Failed to register case");
      }
    } finally {
      setIsSubmitting(false);
      setLoadingStep("");
    }
  };

  return (
    <GlassCard className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700">
          <FilePlus className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Register New Case</h2>
          <p className="text-slate-400 mt-1">
            Create a new case record on the <strong>Blockchain</strong> & Database
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Case Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Case Title *</Label>
          <Input
            id="title"
            placeholder="e.g. State vs John Doe"
            {...register("title")}
            className={cn(errors.title && "border-destructive")}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        {/* Case Type Select */}
        <div className="space-y-2">
          <Label>Case Type *</Label>
          <Select
            value={caseType}
            onValueChange={(value: "criminal" | "civil") => setValue("caseType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select case type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="criminal">Criminal</SelectItem>
              <SelectItem value="civil">Civil</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* FIR Verification Section (Only for Criminal Cases) */}
        {caseType === "criminal" && (
          <div className="space-y-2 p-4 bg-white/5 border border-white/10 rounded-lg">
            <Label htmlFor="firIdInput">Link FIR Record *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="firIdInput"
                  placeholder="Enter FIR ID (e.g. MH/2026/001)"
                  {...register("firIdInput")}
                  className="pl-10"
                  disabled={!!verifiedFir} // Disable input if already verified
                />
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              
              {!verifiedFir ? (
                <Button 
                  type="button" 
                  onClick={handleVerifyFir}
                  disabled={isVerifying || !firIdInput}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                </Button>
              ) : (
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={() => {
                    setVerifiedFir(null);
                    setValue("firIdInput", "");
                  }}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Verification Success Card */}
            {verifiedFir && (
              <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-emerald-300">FIR Verified Successfully</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-slate-300">
                    <span><strong>Station:</strong> {verifiedFir.police_station}</span>
                    <span><strong>Date:</strong> {new Date(verifiedFir.incident_date).toLocaleDateString()}</span>
                    <span className="col-span-2"><strong>Offense:</strong> {verifiedFir.offense_nature}</span>
                    <span className="col-span-2"><strong>Accused:</strong> {verifiedFir.accused_name}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Party Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="partyAName">{partyA} Name *</Label>
            <Input
              id="partyAName"
              placeholder={`Enter ${partyA.toLowerCase()} name`}
              {...register("partyAName")}
              className={cn(errors.partyAName && "border-destructive")}
            />
            {errors.partyAName && <p className="text-sm text-destructive">{errors.partyAName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="partyBName">{partyB} Name *</Label>
            <Input
              id="partyBName"
              placeholder={`Enter ${partyB.toLowerCase()} name`}
              {...register("partyBName")}
              className={cn(errors.partyBName && "border-destructive")}
            />
            {errors.partyBName && <p className="text-sm text-destructive">{errors.partyBName.message}</p>}
          </div>
        </div>

        {/* Legal Personnel (Judge & Lawyers) */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-lg font-medium text-blue-200">Assign Legal Personnel</h3>

          {/* Assign Judge */}
          <div className="space-y-2">
            <Label>Assign Judge</Label>
            <Popover open={judgeOpen} onOpenChange={setJudgeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={judgeOpen} className="w-full justify-between">
                  {getSelectedName(selectedJudgeId, judges) || "Select a judge..."}
                  <SearchIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-popover" align="start">
                <Command>
                  <CommandInput placeholder="Search judges..." value={judgeSearch} onValueChange={setJudgeSearch} />
                  <CommandList>
                    <CommandEmpty>No judges found.</CommandEmpty>
                    <CommandGroup>
                      {filteredJudges.map((judge) => (
                        <CommandItem
                          key={judge.id}
                          value={judge.id}
                          onSelect={() => {
                            setValue("assignedJudgeId", judge.id);
                            setJudgeOpen(false);
                          }}
                        >
                          <span>{judge.full_name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Lawyers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lawyer for {partyA}</Label>
              <Popover open={lawyerAOpen} onOpenChange={setLawyerAOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={lawyerAOpen} className="w-full justify-between">
                    {getSelectedName(selectedLawyerAId, lawyers) || "Select a lawyer..."}
                    <SearchIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover" align="start">
                  <Command>
                    <CommandInput placeholder="Search lawyers..." value={lawyerASearch} onValueChange={setLawyerASearch} />
                    <CommandList>
                      <CommandEmpty>No lawyers found.</CommandEmpty>
                      <CommandGroup>
                        {filteredLawyersA.map((lawyer) => (
                          <CommandItem
                            key={lawyer.id}
                            value={lawyer.id}
                            onSelect={() => {
                              setValue("lawyerPartyAId", lawyer.id);
                              setLawyerAOpen(false);
                            }}
                          >
                            <span>{lawyer.full_name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Lawyer for {partyB}</Label>
              <Popover open={lawyerBOpen} onOpenChange={setLawyerBOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={lawyerBOpen} className="w-full justify-between">
                    {getSelectedName(selectedLawyerBId, lawyers) || "Select a lawyer..."}
                    <SearchIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover" align="start">
                  <Command>
                    <CommandInput placeholder="Search lawyers..." value={lawyerBSearch} onValueChange={setLawyerBSearch} />
                    <CommandList>
                      <CommandEmpty>No lawyers found.</CommandEmpty>
                      <CommandGroup>
                        {filteredLawyersB.map((lawyer) => (
                          <CommandItem
                            key={lawyer.id}
                            value={lawyer.id}
                            onSelect={() => {
                              setValue("lawyerPartyBId", lawyer.id);
                              setLawyerBOpen(false);
                            }}
                          >
                            <span>{lawyer.full_name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Case Description</Label>
          <Textarea
            id="description"
            placeholder="Enter brief description"
            rows={3}
            {...register("description")}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 text-white font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {loadingStep || "Processing..."}
            </>
          ) : (
            <>
              <FilePlus className="w-5 h-5 mr-2" />
              Register Case (Blockchain)
            </>
          )}
        </Button>
      </form>
    </GlassCard>
  );
};