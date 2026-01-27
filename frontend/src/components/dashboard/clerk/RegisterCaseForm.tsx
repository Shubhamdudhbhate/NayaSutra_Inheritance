import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FilePlus, Loader2, Search as SearchIcon, CheckCircle2, XCircle, Gavel, Scale } from "lucide-react";
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
import { 
  clerkCreateCase, 
  clerkAssignJudge, 
  clerkAssignLawyer 
} from "@/utils/BlockChain_Interface/clerk";
import { getFIRByNumber } from "@/services/policeService"; 

// --- SCHEMA UPDATE ---
// Made assignments required for validation
const caseFormSchema = z.object({
  title: z.string().min(3, "Case title must be at least 3 characters").max(200),
  firIdInput: z.string().optional(),
  caseType: z.enum(["criminal", "civil"]),
  partyAName: z.string().min(2, "Party name must be at least 2 characters").max(100),
  partyBName: z.string().min(2, "Party name must be at least 2 characters").max(100),
  assignedJudgeId: z.string({ required_error: "Please assign a judge" }),
  lawyerPartyAId: z.string({ required_error: "Please assign a prosecution lawyer" }),
  lawyerPartyBId: z.string({ required_error: "Please assign a defence lawyer" }),
  description: z.string().optional(),
}).refine((data) => data.lawyerPartyAId !== data.lawyerPartyBId, {
  message: "Prosecution and Defence lawyers cannot be the same person",
  path: ["lawyerPartyBId"], // Show error on the second lawyer field
});

type CaseFormData = z.infer<typeof caseFormSchema>;

type Profile = {
  id: string;
  full_name: string;
  role_category: string;
  unique_id: string | null;
  wallet_address?: string; // We need wallet address for blockchain assignment
};

type VerifiedFIR = {
  id: string;
  fir_number: string;
  police_station: string;
  accused_name: string;
  offense_nature: string;
  incident_date: string;
  informant_name: string;
  informant_contact: string;
  incident_place: string;
  bns_section: string;
  victim_name: string;
  description?: string;
  status: string;
  created_at: string;
  is_on_chain?: boolean;
  blockchain_tx_hash?: string;
};

export const RegisterCaseForm = () => {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  
  const [judges, setJudges] = useState<Profile[]>([]);
  const [lawyers, setLawyers] = useState<Profile[]>([]);
  
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
    formState: { errors },
  } = useForm<CaseFormData>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      caseType: "criminal",
    },
  });

  const caseType = watch("caseType");
  const firIdInput = watch("firIdInput");
  const selectedJudgeId = watch("assignedJudgeId");
  const selectedLawyerAId = watch("lawyerPartyAId");
  const selectedLawyerBId = watch("lawyerPartyBId");

  // Fetch Personnel (Including wallet_address)
  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        const { data: judgesData } = await supabase
          .from("profiles")
          .select("id, full_name, role_category, wallet_address") 
          .eq("role_category", "judge");

        const { data: lawyersData } = await supabase
          .from("profiles")
          .select("id, full_name, role_category, wallet_address")
          .eq("role_category", "lawyer");

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
      return { partyA: "Prosecution", partyB: "Defence" };
    }
    return { partyA: "Plaintiff", partyB: "Defendant" };
  };

  const { partyA, partyB } = getPartyLabels();

  const getSelectedName = (id: string | undefined, list: Profile[]) => {
    if (!id) return null;
    return list.find((item) => item.id === id)?.full_name || null;
  };

  const getWalletAddress = (id: string | undefined, list: Profile[]) => {
    if (!id) return null;
    const person = list.find((item) => item.id === id);
    // Fallback logic or error if wallet missing
    return person?.wallet_address || null;
  };

  const handleVerifyFir = async () => {
    if (!firIdInput) {
      toast.error("Please enter an FIR Number first");
      return;
    }
    setIsVerifying(true);
    setVerifiedFir(null);
    try {
      const firData = await getFIRByNumber(firIdInput);
      if (firData) {
        setVerifiedFir(firData as unknown as VerifiedFIR);
        toast.success("FIR Verified Successfully!");
        setValue("partyBName", firData.accused_name || "Unknown");
      } else {
        toast.error("FIR not found.");
      }
    } catch (error) {
      console.error("FIR Verification Error:", error);
      toast.error("Failed to verify FIR. Please check the FIR number and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // --- MAIN SUBMIT LOGIC (MULTI-STEP BLOCKCHAIN) ---
  const onSubmit = async (data: CaseFormData) => {
    if (!profile?.id) {
      toast.error("Login required");
      return;
    }

    if (data.caseType === "criminal" && !verifiedFir) {
      toast.error("Criminal cases require a verified FIR.");
      return;
    }

    // Validate Wallets Exist
    const judgeWallet = getWalletAddress(data.assignedJudgeId, judges);
    const prosecutionWallet = getWalletAddress(data.lawyerPartyAId, lawyers);
    const defenceWallet = getWalletAddress(data.lawyerPartyBId, lawyers);

    if (!judgeWallet) {
      toast.error("Selected judge must have a wallet address linked in their profile.");
      return;
    }
    if (!prosecutionWallet) {
      toast.error(`Selected ${partyA.toLowerCase()} lawyer must have a wallet address linked in their profile.`);
      return;
    }
    if (!defenceWallet) {
      toast.error(`Selected ${partyB.toLowerCase()} lawyer must have a wallet address linked in their profile.`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // --- STEP 1: CREATE CASE ---
      setLoadingStep("1/4: Creating Case on Blockchain...");
      
      const chainMetaData = JSON.stringify({
        desc: data.description || "",
        type: data.caseType,
        partyA: data.partyAName,
        partyB: data.partyBName
      });

      const firIdForChain = verifiedFir ? verifiedFir.fir_number : "CIVIL-NA";

      const { txHash, caseId } = await clerkCreateCase(
        data.title, 
        firIdForChain, 
        chainMetaData
      );
      
      // --- STEP 2: ASSIGN JUDGE ---
      setLoadingStep("2/4: Assigning Judge...");
      await clerkAssignJudge(caseId, judgeWallet);

      // --- STEP 3: ASSIGN PROSECUTION ---
      setLoadingStep(`3/4: Assigning ${partyA} Lawyer...`);
      await clerkAssignLawyer(caseId, prosecutionWallet, "prosecution");

      // --- STEP 4: ASSIGN DEFENCE ---
      setLoadingStep(`4/4: Assigning ${partyB} Lawyer...`);
      await clerkAssignLawyer(caseId, defenceWallet, "defence");

      // --- FINAL STEP: SAVE TO SUPABASE ---
      setLoadingStep("Finalizing Database Record...");

      const descriptionWithFir = verifiedFir 
        ? `Linked FIR: ${verifiedFir.fir_number}\nStation: ${verifiedFir.police_station}\n\n${data.description || ""}`
        : data.description || "";

      const supabasePayload = {
        case_number: `CASE-${caseId}`, 
        title: data.title,
        case_type: data.caseType,
        party_a_name: data.partyAName,
        party_b_name: data.partyBName,
        
        assigned_judge_id: data.assignedJudgeId,
        lawyer_party_a_id: data.lawyerPartyAId,
        lawyer_party_b_id: data.lawyerPartyBId,
        
        description: descriptionWithFir,
        created_by: profile.id,
        clerk_id: profile.id,
        
        blockchain_tx_hash: txHash,
        on_chain_case_id: caseId,
        is_on_chain: true,
        fir_id: verifiedFir ? verifiedFir.id : null 
      };

      const { error } = await supabase.from("cases").insert(supabasePayload as any);

      if (error) throw error;

      toast.success("Case Registered & Assignments Complete!");
      
      reset();
      setVerifiedFir(null);

    } catch (error: any) {
      console.error("Error registering case:", error);
      
      // More specific error handling
      if (error.code === "ACTION_REJECTED" || error.message?.includes("user rejected") || error.message?.includes("rejected transaction")) {
        toast.error("Transaction rejected by user. Please approve the transaction in your wallet.");
      } else if (error.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds for gas fees. Please ensure you have enough ETH in your wallet.");
      } else if (error.message?.includes("network")) {
        toast.error("Network error. Please check your internet connection and try again.");
      } else if (error.message?.includes("contract")) {
        toast.error("Smart contract error. Please contact support.");
      } else {
        toast.error(error.message || "Failed to register case. Please try again.");
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
            Multi-step blockchain registration with mandatory assignments.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Title & Type */}
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="title">Case Title *</Label>
                <Input id="title" placeholder="e.g. State vs John Doe" {...register("title")} className={cn(errors.title && "border-destructive")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            
            <div className="space-y-2">
                <Label>Case Type *</Label>
                <Select value={caseType} onValueChange={(value: "criminal" | "civil") => setValue("caseType", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="criminal">Criminal</SelectItem>
                        <SelectItem value="civil">Civil</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* FIR Verification (Criminal Only) */}
        {caseType === "criminal" && (
          <div className="space-y-2 p-4 bg-white/5 border border-white/10 rounded-lg">
            <Label htmlFor="firIdInput">Link FIR Record *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input id="firIdInput" placeholder="Enter FIR ID" {...register("firIdInput")} className="pl-10" disabled={!!verifiedFir} />
                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              {!verifiedFir ? (
                <Button type="button" onClick={handleVerifyFir} disabled={isVerifying || !firIdInput} className="bg-blue-600">
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                </Button>
              ) : (
                <Button type="button" variant="destructive" onClick={() => { setVerifiedFir(null); setValue("firIdInput", ""); }}>
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
            {verifiedFir && (
              <div className="mt-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-300">FIR Verified Successfully</p>
                    <p className="text-slate-300 text-sm mt-1">{verifiedFir.police_station}</p>
                  </div>
                  {verifiedFir.is_on_chain && (
                    <div className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                      <span className="text-xs text-blue-300">On-Chain</span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400">FIR Number:</span>
                      <span className="text-slate-200 ml-2 font-mono">{verifiedFir.fir_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Accused:</span>
                      <span className="text-slate-200 ml-2">{verifiedFir.accused_name || "Not specified"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Victim:</span>
                      <span className="text-slate-200 ml-2">{verifiedFir.victim_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Incident Date:</span>
                      <span className="text-slate-200 ml-2">
                        {new Date(verifiedFir.incident_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400">Offense:</span>
                      <span className="text-slate-200 ml-2">{verifiedFir.offense_nature}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">BNS Section:</span>
                      <span className="text-slate-200 ml-2 font-mono">{verifiedFir.bns_section}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Incident Place:</span>
                      <span className="text-slate-200 ml-2">{verifiedFir.incident_place}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Status:</span>
                      <span className="text-slate-200 ml-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          verifiedFir.status === 'Registered' ? 'bg-green-500/20 text-green-300' :
                          verifiedFir.status === 'Under Investigation' ? 'bg-yellow-500/20 text-yellow-300' :
                          verifiedFir.status === 'Chargesheet Filed' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {verifiedFir.status}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                
                {verifiedFir.description && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20">
                    <span className="text-slate-400 text-sm">Description:</span>
                    <p className="text-slate-200 text-sm mt-1">{verifiedFir.description}</p>
                  </div>
                )}
                
                {verifiedFir.blockchain_tx_hash && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm">Blockchain TX:</span>
                      <code className="text-xs bg-slate-800 px-2 py-1 rounded text-blue-300">
                        {verifiedFir.blockchain_tx_hash.slice(0, 10)}...{verifiedFir.blockchain_tx_hash.slice(-8)}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Party Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{partyA} Name *</Label>
            <Input {...register("partyAName")} className={cn(errors.partyAName && "border-destructive")} />
            {errors.partyAName && <p className="text-sm text-destructive">{errors.partyAName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>{partyB} Name *</Label>
            <Input {...register("partyBName")} className={cn(errors.partyBName && "border-destructive")} />
            {errors.partyBName && <p className="text-sm text-destructive">{errors.partyBName.message}</p>}
          </div>
        </div>

        {/* --- ASSIGNMENTS --- */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-lg font-medium text-blue-200 flex items-center gap-2">
            <Gavel className="w-5 h-5" /> Legal Personnel Assignment
          </h3>

          {/* Judge */}
          <div className="space-y-2">
            <Label>Assign Judge *</Label>
            <Popover open={judgeOpen} onOpenChange={setJudgeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {getSelectedName(selectedJudgeId, judges) || "Select Judge..."}
                  <SearchIcon className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search judges..." value={judgeSearch} onValueChange={setJudgeSearch} />
                  <CommandList>
                    <CommandGroup>
                      {judges.filter(j => j.full_name.toLowerCase().includes(judgeSearch.toLowerCase())).map((judge) => (
                        <CommandItem key={judge.id} value={judge.id} onSelect={() => { setValue("assignedJudgeId", judge.id); setJudgeOpen(false); }}>
                          <div className="flex items-center justify-between w-full">
                            <span>{judge.full_name}</span>
                            {judge.wallet_address ? (
                              <span className="text-xs text-green-400 ml-2">✓ Wallet</span>
                            ) : (
                              <span className="text-xs text-red-400 ml-2">No Wallet</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.assignedJudgeId && <p className="text-sm text-destructive">{errors.assignedJudgeId.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prosecution / Plaintiff Lawyer */}
            <div className="space-y-2">
                <Label>Lawyer ({partyA}) *</Label>
                <Popover open={lawyerAOpen} onOpenChange={setLawyerAOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                            {getSelectedName(selectedLawyerAId, lawyers) || "Select Lawyer..."}
                            <Scale className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                        <Command>
                            <CommandInput placeholder="Search..." value={lawyerASearch} onValueChange={setLawyerASearch} />
                            <CommandList>
                                <CommandGroup>
                                    {lawyers.filter(l => l.full_name.toLowerCase().includes(lawyerASearch.toLowerCase())).map((lawyer) => (
                                        <CommandItem key={lawyer.id} value={lawyer.id} onSelect={() => { setValue("lawyerPartyAId", lawyer.id); setLawyerAOpen(false); }}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{lawyer.full_name}</span>
                                                {lawyer.wallet_address ? (
                                                    <span className="text-xs text-green-400 ml-2">✓ Wallet</span>
                                                ) : (
                                                    <span className="text-xs text-red-400 ml-2">No Wallet</span>
                                                )}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {errors.lawyerPartyAId && <p className="text-sm text-destructive">{errors.lawyerPartyAId.message}</p>}
            </div>

            {/* Defence / Defendant Lawyer */}
            <div className="space-y-2">
                <Label>Lawyer ({partyB}) *</Label>
                <Popover open={lawyerBOpen} onOpenChange={setLawyerBOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                            {getSelectedName(selectedLawyerBId, lawyers) || "Select Lawyer..."}
                            <Scale className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                        <Command>
                            <CommandInput placeholder="Search..." value={lawyerBSearch} onValueChange={setLawyerBSearch} />
                            <CommandList>
                                <CommandGroup>
                                    {lawyers.filter(l => l.full_name.toLowerCase().includes(lawyerBSearch.toLowerCase())).map((lawyer) => (
                                        <CommandItem key={lawyer.id} value={lawyer.id} onSelect={() => { setValue("lawyerPartyBId", lawyer.id); setLawyerBOpen(false); }}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{lawyer.full_name}</span>
                                                {lawyer.wallet_address ? (
                                                    <span className="text-xs text-green-400 ml-2">✓ Wallet</span>
                                                ) : (
                                                    <span className="text-xs text-red-400 ml-2">No Wallet</span>
                                                )}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {errors.lawyerPartyBId && <p className="text-sm text-destructive">{errors.lawyerPartyBId.message}</p>}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Case Description</Label>
          <Textarea id="description" rows={3} {...register("description")} />
        </div>

        <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {loadingStep || "Processing..."}
            </>
          ) : (
            <>
              <FilePlus className="w-5 h-5 mr-2" />
              Register Case & Assign Roles
            </>
          )}
        </Button>
      </form>
    </GlassCard>
  );
};