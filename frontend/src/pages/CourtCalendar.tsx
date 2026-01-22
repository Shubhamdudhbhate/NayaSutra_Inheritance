import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  addDays,
  addMonths,
  differenceInDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday as isToday_,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gavel,
  Plus,
  Users,
} from "lucide-react";
import { NyaySutraSidebar } from "@/components/dashboard/NyaySutraSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScheduleHearingDialog } from "@/components/ScheduleHearingDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScheduledHearing {
  id: string;
  case_number: string;
  title: string;
  hearing_date: string;
  hearing_time: string;
  case_type: string;
  party_a_name: string;
  party_b_name: string;
  status: string;
}

const CourtCalendar = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hearings, setHearings] = useState<ScheduledHearing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "completed">(
    "upcoming",
  );
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedCaseForScheduling] = useState<
    {
      id: string;
      case_number: string;
    } | null
  >(null);

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

  useEffect(() => {
    if (profile?.id) {
      fetchHearings();
    }
  }, [profile?.id, currentMonth]);

  const fetchHearings = async () => {
    if (!profile?.id) return;

    try {
      setIsLoading(true);
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // Fetch cases assigned to this judge with next_hearing_date in current month
      const { data, error } = await supabase
        .from("cases")
        .select(
          "id, case_number, title, case_type, party_a_name, party_b_name, assigned_judge_id, status, next_hearing_date",
        )
        .eq("assigned_judge_id", profile.id)
        .gte("next_hearing_date", `${monthStart}T00:00:00`)
        .lte("next_hearing_date", `${monthEnd}T23:59:59`);

      if (error) throw error;

      const formattedHearings: ScheduledHearing[] = (data || []).map((
        caseData: any,
      ) => ({
        id: caseData.id,
        case_number: caseData.case_number,
        title: caseData.title,
        hearing_date: caseData.next_hearing_date,
        hearing_time: caseData.next_hearing_date
          ? format(
            parseISTDateTime(caseData.next_hearing_date),
            "EEEE, d MMMM yyyy  hh:mm:ss a",
          )
          : "TBD",
        case_type: caseData.case_type,
        party_a_name: caseData.party_a_name,
        party_b_name: caseData.party_b_name,
        status: caseData.status === "hearing" ? "scheduled" : caseData.status,
      }));

      setHearings(formattedHearings);
    } catch (error) {
      console.error("Error fetching hearings:", error);
      toast.error("Failed to load calendar hearings");
    } finally {
      setIsLoading(false);
    }
  };

  const getHearingsForDate = (date: Date) => {
    return hearings.filter((h) => isSameDay(new Date(h.hearing_date), date));
  };

  const getUpcomingHearings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort: Today first, then by date and time
    return hearings
      .filter((h) => new Date(h.hearing_date) >= today)
      .sort((a, b) => {
        const dateA = new Date(a.hearing_date);
        const dateB = new Date(b.hearing_date);

        // First sort by date
        const dateDiff = dateA.getTime() - dateB.getTime();
        if (dateDiff !== 0) return dateDiff;

        // If same date, sort by time
        const timeA = a.hearing_time || "00:00";
        const timeB = b.hearing_time || "00:00";
        return timeA.localeCompare(timeB);
      })
      .slice(0, 5);
  };

  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold text-foreground min-w-56 text-center">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
        Today
      </Button>
    </div>
  );

  const renderWeekDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className="grid grid-cols-7 gap-1 mb-3">
        {days.map((day) => (
          <div key={day} className="text-center py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {day}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayHearings = getHearingsForDate(currentDay);
        const isCurrentMonth = isSameMonth(currentDay, currentMonth);
        const isSelectedDay = isSameDay(currentDay, selectedDate);
        const isTodayDate = isToday_(currentDay);

        days.push(
          <motion.button
            key={currentDay.toString()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedDate(currentDay)}
            className={cn(
              "relative min-h-24 p-2 rounded-lg border-2 transition-all text-left",
              !isCurrentMonth && "bg-muted/20 opacity-50",
              isCurrentMonth && !isSelectedDay && !isTodayDate &&
                "border-border/30 hover:border-border/60",
              isTodayDate && "border-primary/60 bg-primary/5",
              isSelectedDay && "border-primary bg-primary/10",
              dayHearings.length > 0 && "border-emerald-500/40",
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  "text-sm font-bold",
                  isTodayDate && "text-primary",
                  !isCurrentMonth && "text-muted-foreground",
                )}
              >
                {format(currentDay, "d")}
              </span>
              {dayHearings.length > 0 && (
                <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-emerald-500/90">
                  {dayHearings.length}
                </Badge>
              )}
            </div>

            {/* Show hearing times */}
            <div className="mt-2 space-y-0.5">
              {dayHearings.slice(0, 2).map((hearing) => (
                <div
                  key={hearing.id}
                  className="text-xs truncate px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium"
                >
                  {hearing.hearing_time}
                </div>
              ))}
              {dayHearings.length > 2 && (
                <div className="text-xs text-muted-foreground text-center font-medium">
                  +{dayHearings.length - 2}
                </div>
              )}
            </div>
          </motion.button>,
        );

        day = addDays(day, 1);
      }

      rows.push(
        <div key={`week-${rows.length}`} className="grid grid-cols-7 gap-1">
          {days}
        </div>,
      );
      days = [];
    }

    return <div className="space-y-1">{rows}</div>;
  };

  const upcomingHearings = getUpcomingHearings();

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "scheduled":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Scheduled
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            Completed
          </Badge>
        );
      case "rescheduled":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            Rescheduled
          </Badge>
        );
      case "adjourned":
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            Adjourned
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <NyaySutraSidebar />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-3 mb-2">
                <Calendar className="h-10 w-10 text-primary" />
                Court Calendar
              </h1>
              <p className="text-muted-foreground">
                View and manage your hearing schedule
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {(["upcoming", "completed"] as const).map((type) => (
                <Button
                  key={type}
                  variant={filter === type ? "default" : "outline"}
                  onClick={() => setFilter(type)}
                  className="capitalize"
                >
                  {type}
                </Button>
              ))}
              <Separator orientation="vertical" className="h-6 mx-2" />
              <Button
                onClick={() => navigate("/courts")}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Schedule Hearing
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Calendar Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-8"
          >
            <Card className="card-glass border-border/50">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading
                  ? (
                    <div className="flex items-center justify-center py-32">
                      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )
                  : (
                    <>
                      {renderCalendarHeader()}
                      {renderWeekDays()}
                      {renderCalendarDays()}
                    </>
                  )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-4 space-y-6"
          >
            {/* Today's Cases - Always Show */}
            <Card className="card-glass border-border/50">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-sm">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {(() => {
                  const todaysCases = getHearingsForDate(new Date());
                  return todaysCases.length === 0
                    ? (
                      <div className="text-center py-8">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm text-muted-foreground">
                          No hearings scheduled
                        </p>
                      </div>
                    )
                    : (
                      <ScrollArea className="h-[280px]">
                        <div className="space-y-3 pr-4">
                          {todaysCases.map((hearing) => (
                            <motion.div
                              key={hearing.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 hover:border-primary/50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">
                                    {hearing.case_number}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {hearing.title}
                                  </p>
                                </div>
                                {getStatusBadge(hearing.status)}
                              </div>
                              <Separator className="my-2" />
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span className="font-medium">
                                    {format(
                                      parseISTDateTime(hearing.hearing_date),
                                      "EEEE, d MMMM yyyy  hh:mm:ss a",
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3" />
                                  <span className="truncate">
                                    {hearing.party_a_name} vs{" "}
                                    {hearing.party_b_name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Gavel className="h-3 w-3" />
                                  <span className="capitalize">
                                    {hearing.case_type}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </ScrollArea>
                    );
                })()}
              </CardContent>
            </Card>

            {/* Dynamic Filter Panel */}
            <Card className="card-glass border-border/50">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-sm flex items-center gap-2">
                  {filter === "upcoming" && (
                    <>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      Upcoming Hearings
                    </>
                  )}
                  {filter === "completed" && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Completed Hearings
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {filter === "upcoming"
                  ? (
                    upcomingHearings.length === 0
                      ? (
                        <div className="text-center py-6">
                          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm text-muted-foreground">
                            No upcoming hearings
                          </p>
                        </div>
                      )
                      : (
                        <div className="space-y-2">
                          {upcomingHearings.map((hearing, idx) => {
                            const hearingDate = new Date(hearing.hearing_date);
                            const daysAway = differenceInDays(
                              hearingDate,
                              new Date(),
                            );
                            return (
                              <motion.div
                                key={hearing.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-2.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <p className="font-medium text-sm truncate">
                                    {hearing.case_number}
                                  </p>
                                  <Badge className="text-xs bg-primary/30 text-primary">
                                    {daysAway === 0 ? "Today" : `${daysAway}d`}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(
                                    parseISTDateTime(hearing.hearing_date),
                                    "EEEE, d MMMM yyyy  hh:mm:ss a",
                                  )}
                                </p>
                              </motion.div>
                            );
                          })}
                        </div>
                      )
                  )
                  : (
                    (() => {
                      const completedHearings = hearings.filter(
                        (h) =>
                          h.status === "completed" ||
                          new Date(h.hearing_date) < new Date(),
                      ).sort((a, b) =>
                        new Date(b.hearing_date).getTime() -
                        new Date(a.hearing_date).getTime()
                      );

                      return completedHearings.length === 0
                        ? (
                          <div className="text-center py-6">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm text-muted-foreground">
                              No completed hearings
                            </p>
                          </div>
                        )
                        : (
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-2 pr-4">
                              {completedHearings.map((hearing, idx) => (
                                <motion.div
                                  key={hearing.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="p-2.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="font-medium text-sm truncate">
                                      {hearing.case_number}
                                    </p>
                                    <Badge className="text-xs bg-emerald-500/30 text-emerald-400">
                                      Completed
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(hearing.hearing_date),
                                      "MMM d, yyyy",
                                    )} at {hearing.hearing_time}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </ScrollArea>
                        );
                    })()
                  )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="card-glass border-border/50">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-sm">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      This Month
                    </span>
                    <span className="font-semibold text-lg">
                      {hearings.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Upcoming
                    </span>
                    <span className="font-semibold text-lg text-primary">
                      {upcomingHearings.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Completed
                    </span>
                    <span className="font-semibold text-lg text-emerald-400">
                      {hearings.filter((h) =>
                        h.status?.toLowerCase() === "completed"
                      ).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Schedule Hearing Dialog */}
        <ScheduleHearingDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          caseId={selectedCaseForScheduling?.id || ""}
          caseNumber={selectedCaseForScheduling?.case_number || ""}
          onSuccess={() => {
            fetchHearings();
            setScheduleDialogOpen(false);
          }}
        />
      </main>
    </div>
  );
};

export default CourtCalendar;
