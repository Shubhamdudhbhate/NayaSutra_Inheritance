import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Scale, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const caseFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  judgeId: z.string().uuid("Select a valid judge"),
  clerkId: z.string().uuid("Select a valid clerk"),
  plaintiffName: z.string().trim().min(2, "Plaintiff name is required"),
  defendantName: z.string().trim().min(2, "Defendant name is required"),
});

type CaseFormValues = z.infer<typeof caseFormSchema>;

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  onCaseCreated: () => void;
}

type Profile = {
  id: string;
  full_name: string;
  role_category: string | null;
};

const generateCaseNumber = (sectionId: string) => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `CASE/${year}/${sectionId.slice(0, 4).toUpperCase()}/${random}`;
};

export const CreateCaseDialog = ({
  open,
  onOpenChange,
  sectionId,
  onCaseCreated,
}: CreateCaseDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      judgeId: "",
      clerkId: "",
      plaintiffName: "",
      defendantName: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      setCaseNumber(generateCaseNumber(sectionId));
      fetchProfiles();
    }
  }, [open, sectionId]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role_category")
      .order("full_name");

    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }

    setProfiles(data || []);
  };

  const regenerateCaseNumber = () => {
    setCaseNumber(generateCaseNumber(sectionId));
  };

  const judiciaryProfiles = profiles.filter((p) => p.role_category === "judiciary");
  const legalProfiles = profiles.filter((p) => p.role_category === "legal_practitioner");

  const onSubmit = async (data: CaseFormValues) => {
    try {
      setIsLoading(true);

      // Ensure judge/clerk still exist in the fetched registry list
      const requiredIds = [data.judgeId, data.clerkId];
      const existing = profiles.filter((p) => requiredIds.includes(p.id));
      if (existing.length !== 2) {
        throw new Error("Please select Judge and Clerk from the dropdowns (registered users).");
      }

      // Insert case using the new schema
      const { error } = await supabase
        .from("cases")
        .insert({
          case_number: caseNumber,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          blockchain_tx_hash: "", // TODO: Generate actual blockchain transaction hash
          on_chain_case_id: caseNumber, // Using case number as on-chain ID for now
          case_type: "civil" as const,
          party_a_name: data.plaintiffName.trim(),
          party_b_name: data.defendantName.trim(),
          assigned_judge_id: data.judgeId,
          clerk_id: data.clerkId,
          status: "pending" as const,
        });

      if (error) throw error;

      toast.success(`Case ${caseNumber} created successfully`);
      form.reset();
      onOpenChange(false);
      onCaseCreated();
    } catch (error) {
      console.error("Error creating case:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create case");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Create New Case
          </DialogTitle>
          <DialogDescription>
            Register a new case in this section. Link all required personnel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Case Number */}
          <div className="space-y-2">
            <Label>Case Number (Auto-generated)</Label>
            <div className="flex gap-2">
              <Input
                value={caseNumber}
                readOnly
                className="bg-secondary/50 border-white/10 font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={regenerateCaseNumber}
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Case Title *</Label>
            <Input
              id="title"
              placeholder="e.g., State vs. Sharma"
              className="bg-secondary/30 border-white/10"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Brief case description..."
              className="min-h-[80px] bg-secondary/30 border-white/10"
              {...form.register("description")}
            />
          </div>

          {/* Personnel Section */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="w-4 h-4" />
              Link Personnel
            </div>

            {/* Judge Selection */}
            <div className="space-y-2">
              <Label>Presiding Judge *</Label>
              <Select
                onValueChange={(v) => form.setValue("judgeId", v, { shouldValidate: true })}
                value={form.watch("judgeId")}
              >
                <SelectTrigger className="bg-secondary/30 border-white/10">
                  <SelectValue placeholder="Select judge" />
                </SelectTrigger>
                <SelectContent>
                  {judiciaryProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.judgeId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.judgeId.message}
                </p>
              )}
            </div>

            {/* Clerk Selection */}
            <div className="space-y-2">
              <Label>Court Clerk *</Label>
              <Select
                onValueChange={(v) => form.setValue("clerkId", v, { shouldValidate: true })}
                value={form.watch("clerkId")}
              >
                <SelectTrigger className="bg-secondary/30 border-white/10">
                  <SelectValue placeholder="Select clerk" />
                </SelectTrigger>
                <SelectContent>
                  {legalProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.clerkId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.clerkId.message}
                </p>
              )}
            </div>

            {/* Plaintiff (Manual) */}
            <div className="space-y-2">
              <Label htmlFor="plaintiffName">Plaintiff *</Label>
              <Input
                id="plaintiffName"
                placeholder="Enter plaintiff name"
                className="bg-secondary/30 border-white/10"
                {...form.register("plaintiffName")}
              />
              {form.formState.errors.plaintiffName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.plaintiffName.message}
                </p>
              )}
            </div>

            {/* Defendant (Manual) */}
            <div className="space-y-2">
              <Label htmlFor="defendantName">Defendant *</Label>
              <Input
                id="defendantName"
                placeholder="Enter defendant name"
                className="bg-secondary/30 border-white/10"
                {...form.register("defendantName")}
              />
              {form.formState.errors.defendantName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.defendantName.message}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !form.formState.isValid}
              className="glow-button"
            >
              {isLoading ? "Creating..." : "Create Case"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
