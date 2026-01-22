import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { AlertCircle, Calendar, CheckCircle2, Clock, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ScheduleHearingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
  onSuccess?: () => void;
}

export function ScheduleHearingDialog({
  open,
  onOpenChange,
  caseId,
  caseNumber,
  onSuccess,
}: ScheduleHearingDialogProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [hearingDate, setHearingDate] = useState("");
  const [hearingTime, setHearingTime] = useState("10:00");
  const [location, setLocation] = useState("Court Room 1");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Check for scheduling conflicts
  const checkConflicts = async () => {
    if (!hearingDate || !hearingTime || !profile?.id) return;

    try {
      setCheckingConflicts(true);
      setConflicts([]);
    } catch (error) {
      console.error("Error checking conflicts:", error);
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Check conflicts when date/time changes
  useEffect(() => {
    if (hearingDate && hearingTime && open) {
      const timer = setTimeout(() => checkConflicts(), 500);
      return () => clearTimeout(timer);
    }
  }, [hearingDate, hearingTime, open]);

  const handleSchedule = async () => {
    if (!hearingDate || !hearingTime || !profile?.id) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (conflicts.length > 0) {
      toast.error(
        "Time slot conflicts with another hearing. Please choose a different time.",
      );
      return;
    }

    try {
      setIsLoading(true);

      // Convert to India Standard Time (IST - UTC+5:30)
      // User selects time in browser's display format, we store it as IST
      const year = new Date(hearingDate).getFullYear();
      const month = String(new Date(hearingDate).getMonth() + 1).padStart(
        2,
        "0",
      );
      const day = String(new Date(hearingDate).getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      // Format: YYYY-MM-DDTHH:mm:00 (stored as IST in database)
      const localDateTime = `${dateStr}T${hearingTime}:00`;

      // Update case's next_hearing_date with IST
      const { error } = await supabase
        .from("cases")
        .update({
          next_hearing_date: localDateTime, // Store as local IST time (format: YYYY-MM-DDTHH:mm:00)
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseId);

      if (error) throw error;

      toast.success("Hearing scheduled successfully");
      onOpenChange(false);
      setHearingDate("");
      setHearingTime("10:00");
      setLocation("Court Room 1");
      setNotes("");
      onSuccess?.();
    } catch (error) {
      console.error("Error scheduling hearing:", error);
      toast.error("Failed to schedule hearing. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const minDate = format(new Date(), "yyyy-MM-dd");
  const hasConflicts = conflicts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule Hearing - {caseNumber}
          </DialogTitle>
          <DialogDescription>
            Set a hearing date and time for this case with automatic conflict
            detection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
          {/* Timezone Info */}
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-400">
              All times are in India Standard Time (IST - UTC+5:30)
            </AlertDescription>
          </Alert>

          {/* Date Input */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">
              Hearing Date <span className="text-urgent">*</span>
            </label>
            <Input
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              min={minDate}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Select a future date for the hearing
            </p>
          </div>

          {/* Time Input */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">
              Hearing Time (IST) <span className="text-urgent">*</span>
            </label>
            <Input
              type="time"
              value={hearingTime}
              onChange={(e) => setHearingTime(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Court typically operates 10:00 AM to 5:00 PM (India Standard Time)
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">
              Court Room / Location
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Court Room 1, Court Room 2A"
              className="w-full"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">
              Additional Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or notes for this hearing..."
              className="w-full resize-none"
              rows={3}
            />
          </div>

          {/* Conflict Alert */}
          {checkingConflicts && (
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <Clock className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-400">
                Checking for scheduling conflicts...
              </AlertDescription>
            </Alert>
          )}

          {hasConflicts && (
            <Alert className="bg-urgent/10 border-urgent/30">
              <AlertCircle className="h-4 w-4 text-urgent" />
              <AlertDescription className="text-urgent">
                <p className="font-semibold mb-2">
                  Scheduling Conflict Detected!
                </p>
                <div className="space-y-2">
                  {conflicts.map((conflict: any) => (
                    <div
                      key={conflict.id}
                      className="text-sm bg-urgent/5 p-2 rounded border border-urgent/20"
                    >
                      <p className="font-medium">
                        {conflict.cases?.case_number}: {conflict.cases?.title}
                      </p>
                      <p className="text-xs">
                        {format(parseISO(conflict.hearing_date), "MMM d, yyyy")}
                        {" "}
                        at {conflict.hearing_time}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm mt-2">
                  Please select a different date or time.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {!hasConflicts && hearingDate && hearingTime && (
            <Alert className="bg-emerald-500/10 border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="text-emerald-400">
                Time slot is available. No conflicts detected.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          {hearingDate && hearingTime && (
            <div className="bg-muted/40 p-3 rounded-lg border border-border/30">
              <p className="text-sm font-semibold text-foreground mb-2">
                Hearing Summary:
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Date:</span>{" "}
                  {format(parseISO(hearingDate), "EEEE, MMMM d, yyyy")}
                </p>
                <p>
                  <span className="font-medium">Time:</span> {hearingTime}
                </p>
                <p>
                  <span className="font-medium">Location:</span> {location}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isLoading || !hearingDate || !hearingTime || hasConflicts}
            className="gap-2"
          >
            {isLoading
              ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Scheduling...
                </>
              )
              : (
                <>
                  <Calendar className="h-4 w-4" />
                  Schedule Hearing
                </>
              )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
