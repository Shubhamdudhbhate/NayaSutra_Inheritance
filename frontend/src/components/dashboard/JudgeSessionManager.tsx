import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  Clock,
  UserPlus,
  CheckCircle2,
  XCircle,
  History,
  AlertCircle,
  Users,
  Gavel,
  LogOut,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/layout/GlassWrapper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { createSessionEndNotifications } from "@/services/notificationService";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type HearingStatus = "pending" | "scheduled";

type HearingHistoryEntry = {
  id: string;
  date: string;
  time: string;
  reason: string | null;
  status: "scheduled" | "postponed" | "completed";
  createdAt: string;
};

type CaseDetails = {
  status: HearingStatus;
  currentHearingDate: string | null;
  currentHearingTime: string | null;
  hearingHistory: HearingHistoryEntry[];
};

type AccessRequest = {
  requestId: string;
  requesterId: string;
  requesterName: string;
  role: "Clerk" | "Lawyer";
  message: string;
  requestedAt: string;
};

type AllottedMember = {
  id: string;
  requesterId: string;
  requesterName: string;
  role: "Clerk" | "Lawyer" | "Judge";
  canUpload: boolean;
  authorizedAt: string;
};

type AvailableJudge = {
  id: string;
  full_name: string;
};

interface JudgeSessionManagerProps {
  caseId: string;
  currentJudgeId: string;
}

// ============================================================================
// API SERVICE FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const apiService = {
  // Fetch case details
  async getCaseDetails(caseId: string): Promise<CaseDetails> {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/details`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to fetch case details" }));
      throw new Error(error.message || "Failed to fetch case details");
    }

    return response.json();
  },

  // Fetch pending access requests
  async getAccessRequests(caseId: string): Promise<AccessRequest[]> {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/requests`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to fetch access requests" }));
      throw new Error(error.message || "Failed to fetch access requests");
    }

    return response.json();
  },

  // Fetch allotted members
  async getAllottedMembers(caseId: string): Promise<AllottedMember[]> {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/members`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to fetch allotted members" }));
      throw new Error(error.message || "Failed to fetch allotted members");
    }

    return response.json();
  },

  // Schedule or postpone hearing
  async scheduleHearing(
    caseId: string,
    data: { date: string; time: string; reason?: string }
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to schedule hearing" }));
      throw new Error(error.message || "Failed to schedule hearing");
    }
  },

  // Approve access request
  async approveMember(
    caseId: string,
    data: { requestId: string; userId: string; canUpload: boolean }
  ): Promise<AllottedMember> {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/approve-member`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to approve member" }));
      throw new Error(error.message || "Failed to approve member");
    }

    return response.json();
  },

  // Reject access request
  async rejectRequest(caseId: string, requestId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/reject-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to reject request" }));
      throw new Error(error.message || "Failed to reject request");
    }
  },

  // Get available judges for transfer
  async getAvailableJudges(currentJudgeId: string): Promise<AvailableJudge[]> {
    const response = await fetch(`${API_BASE_URL}/judges/available?exclude=${currentJudgeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to fetch available judges" }));
      throw new Error(error.message || "Failed to fetch available judges");
    }

    return response.json();
  },

  // Transfer case
  async transferCase(caseId: string, newJudgeId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ newJudgeId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to transfer case" }));
      throw new Error(error.message || "Failed to transfer case");
    }
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function JudgeSessionManager({
  caseId,
  currentJudgeId,
}: JudgeSessionManagerProps) {
  const navigate = useNavigate();
  const { roleTheme } = useRole();

  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [allottedMembers, setAllottedMembers] = useState<AllottedMember[]>([]);
  const [availableJudges, setAvailableJudges] = useState<AvailableJudge[]>([]);

  // Modal States
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [postponeModalOpen, setPostponeModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [canUploadToggle, setCanUploadToggle] = useState(true);

  // Form States
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [postponeReason, setPostponeReason] = useState<string>("");
  const [postponeDate, setPostponeDate] = useState<Date | undefined>(undefined);
  const [postponeTime, setPostponeTime] = useState<string>("");
  const [selectedTransferJudge, setSelectedTransferJudge] = useState<string>("");

  // Loading States for Actions
  const [isScheduling, setIsScheduling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchAllData = useCallback(async () => {
    if (!caseId || !currentJudgeId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [details, requests, members] = await Promise.all([
        apiService.getCaseDetails(caseId),
        apiService.getAccessRequests(caseId),
        apiService.getAllottedMembers(caseId),
      ]);

      setCaseDetails(details);
      setAccessRequests(requests);
      setAllottedMembers(members);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load case data";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error fetching case data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [caseId, currentJudgeId]);

  const fetchAvailableJudges = useCallback(async () => {
    try {
      const judges = await apiService.getAvailableJudges(currentJudgeId);
      setAvailableJudges(judges);
    } catch (err) {
      console.error("Error fetching available judges:", err);
      toast.error("Failed to load available judges");
    }
  }, [currentJudgeId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (transferModalOpen) {
      fetchAvailableJudges();
    }
  }, [transferModalOpen, fetchAvailableJudges]);

  // Initialize dates when modals open
  useEffect(() => {
    if (scheduleModalOpen) {
      setSelectedDate(undefined);
      setSelectedTime("");
    }
  }, [scheduleModalOpen]);

  useEffect(() => {
    if (postponeModalOpen && caseDetails?.currentHearingDate) {
      const currentDate = new Date(caseDetails.currentHearingDate);
      setPostponeDate(currentDate);
      setPostponeTime(caseDetails.currentHearingTime || "");
    } else if (postponeModalOpen) {
      setPostponeDate(undefined);
      setPostponeTime("");
    }
    if (postponeModalOpen) {
      setPostponeReason("");
    }
  }, [postponeModalOpen, caseDetails?.currentHearingDate, caseDetails?.currentHearingTime]);

  // Generate time slots
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const TIME_SLOTS = generateTimeSlots();

  // ============================================================================
  // WORKFLOW HANDLERS
  // ============================================================================

  const handleScheduleHearing = () => {
    setScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select both date and time");
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    if (scheduledDateTime < new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    setIsScheduling(true);
    try {
      await apiService.scheduleHearing(caseId, {
        date: scheduledDateTime.toISOString(),
        time: selectedTime,
      });

      toast.success("Hearing scheduled successfully");
      setScheduleModalOpen(false);
      setSelectedDate(undefined);
      setSelectedTime("");
      await fetchAllData(); // Refresh data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to schedule hearing";
      toast.error(errorMessage);
    } finally {
      setIsScheduling(false);
    }
  };

  const handlePostponeHearing = () => {
    setPostponeModalOpen(true);
  };

  const handlePostponeSubmit = async () => {
    if (!postponeReason.trim()) {
      toast.error("Please provide a reason for postponement");
      return;
    }

    if (!postponeDate || !postponeTime) {
      toast.error("Please select both new date and time");
      return;
    }

    const [hours, minutes] = postponeTime.split(":").map(Number);
    const newScheduledDateTime = new Date(postponeDate);
    newScheduledDateTime.setHours(hours, minutes, 0, 0);

    if (newScheduledDateTime < new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    setIsScheduling(true);
    try {
      await apiService.scheduleHearing(caseId, {
        date: newScheduledDateTime.toISOString(),
        time: postponeTime,
        reason: postponeReason.trim(),
      });

      toast.success("Hearing postponed successfully");
      setPostponeModalOpen(false);
      setPostponeReason("");
      setPostponeDate(undefined);
      setPostponeTime("");
      await fetchAllData(); // Refresh data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to postpone hearing";
      toast.error(errorMessage);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleApproveRequest = (request: AccessRequest) => {
    setSelectedRequest(request);
    setCanUploadToggle(true);
    setApprovalModalOpen(true);
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await apiService.rejectRequest(caseId, requestId);
      setAccessRequests((prev) => prev.filter((req) => req.requestId !== requestId));
      toast.success("Access request rejected");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject request";
      toast.error(errorMessage);
    }
  };

  const handleConfirmApproval = async () => {
    if (!selectedRequest) return;

    setIsApproving(true);
    try {
      const newMember = await apiService.approveMember(caseId, {
        requestId: selectedRequest.requestId,
        userId: selectedRequest.requesterId,
        canUpload: canUploadToggle,
      });

      // Update local state
      setAccessRequests((prev) =>
        prev.filter((req) => req.requestId !== selectedRequest.requestId)
      );
      setAllottedMembers((prev) => [...prev, newMember]);

      toast.success(
        `${selectedRequest.requesterName} has been added to the case team${canUploadToggle ? " with upload permissions" : ""}`
      );
      setApprovalModalOpen(false);
      setSelectedRequest(null);
      setCanUploadToggle(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve member";
      toast.error(errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  const handleTransferCase = async () => {
    if (!selectedTransferJudge) {
      toast.error("Please select a judge to transfer the case to");
      return;
    }

    setIsTransferring(true);
    try {
      // 1. Send session end notifications first
      const sessionId = `session_${Date.now()}_${caseId.substring(0, 8)}`;
      const caseNumber = `CASE-${caseId.substring(0, 6).toUpperCase()}`;
      
      await createSessionEndNotifications({
        caseId,
        sessionId,
        judgeId: currentJudgeId,
        caseNumber,
        endedAt: new Date().toISOString(),
        notes: "Case transferred to another judge"
      });

      // 2. Then transfer the case
      await apiService.transferCase(caseId, selectedTransferJudge);
      toast.success("Case transferred successfully and notifications sent to participants");
      setTransferModalOpen(false);
      setSelectedTransferJudge("");

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to transfer case";
      toast.error(errorMessage);
    } finally {
      setIsTransferring(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading case data...</p>
        </div>
      </div>
    );
  }

  if (error || !caseDetails) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <GlassCard className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Case</h3>
            <p className="text-sm text-muted-foreground mb-4">{error || "Case data not available"}</p>
            <Button onClick={fetchAllData} variant="outline">
              Retry
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const currentHearingDate = caseDetails.currentHearingDate
    ? new Date(caseDetails.currentHearingDate)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className={cn("w-6 h-6", `text-${roleTheme.primary}`)} />
            Session Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Case ID: {caseId}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setTransferModalOpen(true)}
          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          End Session / Transfer Case
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SCHEDULING & POSTPONEMENT */}
        <div className="space-y-4">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CalendarIcon className={cn("w-5 h-5", `text-${roleTheme.primary}`)} />
              Hearing Status
            </h3>

            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Status</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      caseDetails.status === "scheduled"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}
                  >
                    {caseDetails.status === "scheduled" ? "Scheduled" : "Pending"}
                  </Badge>
                </div>

                {caseDetails.status === "scheduled" && currentHearingDate && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(currentHearingDate, "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {caseDetails.currentHearingTime
                          ? format(
                              new Date(`2000-01-01T${caseDetails.currentHearingTime}`),
                              "h:mm a"
                            )
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {caseDetails.status === "pending" ? (
                  <Button
                    onClick={handleScheduleHearing}
                    className={cn("flex-1", `bg-${roleTheme.primary} hover:opacity-90`)}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Schedule Hearing
                  </Button>
                ) : (
                  <Button
                    onClick={handlePostponeHearing}
                    variant="outline"
                    className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Postpone
                  </Button>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Session History */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <History className={cn("w-5 h-5", `text-${roleTheme.primary}`)} />
              Session History
            </h3>

            {caseDetails.hearingHistory.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No session history available
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                <AnimatePresence>
                  {caseDetails.hearingHistory.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="rounded-lg border p-4 bg-secondary/30"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {format(new Date(entry.date), "MMM d, yyyy")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              at {format(new Date(`2000-01-01T${entry.time}`), "h:mm a")}
                            </span>
                          </div>
                          {entry.reason && (
                            <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                              <p className="text-xs font-medium text-amber-400 mb-1">
                                Postponement Reason:
                              </p>
                              <p className="text-xs text-muted-foreground">{entry.reason}</p>
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            entry.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : entry.status === "postponed"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          )}
                        >
                          {entry.status}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </GlassCard>
        </div>

        {/* ACCESS REQUESTS & ALLOTTED MEMBERS */}
        <div className="space-y-4">
          {/* Pending Access Requests */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus className={cn("w-5 h-5", `text-${roleTheme.primary}`)} />
              Pending Access Requests
              {accessRequests.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {accessRequests.length}
                </Badge>
              )}
            </h3>

            {accessRequests.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                No pending requests
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                <AnimatePresence>
                  {accessRequests.map((request) => (
                    <motion.div
                      key={request.requestId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="rounded-lg border p-4 bg-amber-500/5 border-amber-500/20"
                    >
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm">{request.requesterName}</p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                request.role === "Lawyer"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              )}
                            >
                              {request.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            ID: {request.requesterId}
                          </p>
                        </div>

                        <div className="p-2 rounded bg-muted/50 border border-white/5">
                          <p className="text-xs text-muted-foreground mb-1">Message:</p>
                          <p className="text-xs">{request.message}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRequest(request.requestId)}
                            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </GlassCard>

          {/* Allotted Members */}
          <GlassCard className="p-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="allotted-members" className="border-none">
                <AccordionTrigger className="hover:no-underline">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className={cn("w-5 h-5", `text-${roleTheme.primary}`)} />
                    Case Team / Allotted Members
                    <Badge variant="outline" className="ml-2">
                      {allottedMembers.length}
                    </Badge>
                  </h3>
                </AccordionTrigger>
                <AccordionContent>
                  {allottedMembers.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No members allotted yet
                    </div>
                  ) : (
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Permissions</TableHead>
                            <TableHead>Authorized</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allottedMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">
                                {member.requesterName}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    member.role === "Lawyer"
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      : member.role === "Clerk"
                                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  )}
                                >
                                  {member.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {member.canUpload ? (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1 w-fit"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    Can Upload
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-gray-500/10 text-gray-400 border-gray-500/20 flex items-center gap-1 w-fit"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                    View Only
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(member.authorizedAt), "MMM d, yyyy")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </GlassCard>
        </div>
      </div>

      {/* MODALS */}
      {/* Schedule Hearing Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Hearing</DialogTitle>
            <DialogDescription>Select a date and time slot for the hearing</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Select Date
              </Label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Select Time
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleSubmit} disabled={!selectedDate || !selectedTime || isScheduling}>
              {isScheduling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Schedule Hearing"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Postpone Hearing Modal */}
      <Dialog open={postponeModalOpen} onOpenChange={setPostponeModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Postpone Hearing</DialogTitle>
            <DialogDescription>Provide a reason and select a new date and time</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Postponement *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Witness unavailable, Additional evidence needed..."
                value={postponeReason}
                onChange={(e) => setPostponeReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                New Date
              </Label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={postponeDate}
                  onSelect={setPostponeDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                New Time
              </Label>
              <Select value={postponeTime} onValueChange={setPostponeTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPostponeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePostponeSubmit}
              disabled={!postponeReason.trim() || !postponeDate || !postponeTime || isScheduling}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isScheduling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Postponing...
                </>
              ) : (
                "Postpone Hearing"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Modal */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Grant Upload Permissions?</DialogTitle>
            <DialogDescription>Configure access permissions for this participant</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div>
                  <p className="text-sm font-medium">{selectedRequest.requesterName}</p>
                  <p className="text-xs text-muted-foreground">{selectedRequest.role}</p>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-muted-foreground mb-2">Request Message:</p>
                  <p className="text-xs">{selectedRequest.message}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-background">
                <div className="space-y-0.5">
                  <Label htmlFor="upload-toggle" className="text-sm font-medium">
                    Can Upload Files
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow this participant to upload evidence and documents
                  </p>
                </div>
                <Switch
                  id="upload-toggle"
                  checked={canUploadToggle}
                  onCheckedChange={setCanUploadToggle}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalModalOpen(false);
                setSelectedRequest(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApproval}
              disabled={isApproving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Authorization
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case Transfer Modal */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>End Session / Transfer Case</DialogTitle>
            <DialogDescription>
              Transfer this case to another judge. You will no longer have access to manage this case.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-400 mb-1">Important Notice</p>
                  <p className="text-xs text-muted-foreground">
                    Transferring this case will assign it to the selected judge. This action cannot be undone.
                    Make sure all pending tasks are completed before transferring.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="judge-select">Select Next Judge *</Label>
              <Select value={selectedTransferJudge} onValueChange={setSelectedTransferJudge}>
                <SelectTrigger id="judge-select">
                  <SelectValue placeholder="Choose a judge to transfer the case to" />
                </SelectTrigger>
                <SelectContent>
                  {availableJudges.map((judge) => (
                    <SelectItem key={judge.id} value={judge.id}>
                      {judge.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableJudges.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No other judges available. Please add judges to the system first.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransferCase}
              disabled={!selectedTransferJudge || isTransferring}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Transfer Case
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

