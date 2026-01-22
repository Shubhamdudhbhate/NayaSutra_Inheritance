import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Briefcase, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Case {
  id: string;
  case_number: string;
  title: string;
  court_name: string | null;
  assigned_judge_id: string | null;
  next_hearing_date: string | null;
  status: string;
}

export function CurrentAndTodaysCases() {
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [todaysCases, setTodaysCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("cases")
          .select(
            "id, case_number, title, court_name, assigned_judge_id, next_hearing_date, status",
          )
          .not("next_hearing_date", "is", null)
          .order("next_hearing_date", { ascending: true });

        if (error) throw error;

        if (!data) {
          setCurrentCase(null);
          setTodaysCases([]);
          return;
        }

        // Get current time in India Standard Time (IST - UTC+5:30)
        const now = new Date();
        // Calculate IST offset: IST is UTC+5:30
        const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
        const utcTime = now.getTime();
        const istTime = new Date(utcTime + istOffset);

        console.log("Current UTC time:", now.toLocaleString());
        console.log("Current IST time:", istTime.toLocaleString());
        console.log("Checking cases...");

        let currentCaseFound: Case | null = null;
        const todayOnlyButDifferentTimes: Case[] = [];

        for (const caseItem of data) {
          try {
            // Parse the local datetime string in IST format
            // The stored format is: YYYY-MM-DDTHH:mm:00 (in IST)
            const dateStr = caseItem.next_hearing_date;

            // Extract date parts manually to avoid timezone conversion
            if (!dateStr) continue;
            const [datePart, timePart] = dateStr.split("T");
            if (!datePart || !timePart) continue;

            const [year, month, day] = datePart.split("-").map(Number);
            const [hours, minutes] = timePart.split(":").map(Number);

            // Validate parsed values
            if (
              !year || !month || !day || hours === undefined ||
              minutes === undefined
            ) continue;

            // Create a date in IST (local timezone for India)
            const hearingDate = new Date(
              year,
              month - 1,
              day,
              hours,
              minutes,
              0,
            );

            console.log(
              `Case: ${caseItem.case_number}, Hearing (IST): ${hearingDate.toLocaleString()}`,
            );

            // Get today's date in IST
            const todayIST = new Date(
              istTime.getUTCFullYear(),
              istTime.getUTCMonth(),
              istTime.getUTCDate(),
            );

            // Check if case is TODAY (in IST)
            const isToday = hearingDate.getDate() === todayIST.getDate() &&
              hearingDate.getMonth() === todayIST.getMonth() &&
              hearingDate.getFullYear() === todayIST.getFullYear();

            console.log(`Is today in IST? ${isToday}`);

            if (isToday) {
              const hearingTime = hearingDate.getTime();
              const timeBuffer = 30 * 60 * 1000; // 30 minutes buffer
              const isActive = utcTime >= hearingTime - timeBuffer &&
                utcTime <= hearingTime + timeBuffer;

              console.log(
                `Hearing time: ${
                  new Date(hearingTime).toLocaleString()
                }, Is active? ${isActive}`,
              );

              // Check if case is currently happening (within 30 min buffer before or after)
              if (isActive) {
                if (!currentCaseFound) {
                  currentCaseFound = caseItem;
                  console.log("✓ Set as current case");
                }
              } else {
                // Add to today's cases if not current
                todayOnlyButDifferentTimes.push(caseItem);
              }
            }
          } catch (err) {
            console.error("Error parsing case date:", err);
            continue;
          }
        }

        setCurrentCase(currentCaseFound);
        setTodaysCases(todayOnlyButDifferentTimes);
      } catch (error) {
        console.error("Error fetching cases:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
    // Refetch every 5 minutes
    const interval = setInterval(fetchCases, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Case - Active Now */}
      {currentCase
        ? (
          <Card className="border-2 border-red-500 bg-red-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <CardTitle className="text-lg text-red-900">
                    Currently Active
                  </CardTitle>
                </div>
                <Badge variant="destructive" className="animate-pulse">
                  LIVE NOW
                </Badge>
              </div>
              <CardDescription className="text-red-700">
                Case is in session right now
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-red-600 font-medium">Case Number</p>
                <p className="font-mono font-bold text-lg">
                  {currentCase.case_number}
                </p>
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">Title</p>
                <p className="font-medium">{currentCase.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-red-600 font-medium">Court</p>
                  <p className="text-sm">{currentCase.court_name}</p>
                </div>
                <div>
                  <p className="text-sm text-red-600 font-medium">Judge ID</p>
                  <p className="text-sm font-mono text-xs">
                    {currentCase.assigned_judge_id}
                  </p>
                </div>
              </div>
              {currentCase.next_hearing_date && (
                <div className="flex items-center gap-2 pt-2 border-t border-red-200">
                  <Clock className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-medium">
                    {format(new Date(currentCase.next_hearing_date), "h:mm a")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )
        : (
          <Card className="border-2 border-gray-300 bg-gray-50">
            <CardHeader>
              <CardTitle className="text-lg text-gray-600">
                No Active Case
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                No case is currently in session
              </p>
            </CardContent>
          </Card>
        )}

      {/* Today's Other Cases */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Today's Schedule (IST)</CardTitle>
              <CardDescription>
                {todaysCases.length}{" "}
                more case{todaysCases.length !== 1 ? "s" : ""}{" "}
                scheduled for today in India Standard Time
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {todaysCases.length > 0
            ? (
              <div className="space-y-3">
                {todaysCases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-bold text-blue-900">
                          {caseItem.case_number}
                        </p>
                        <p className="font-medium text-sm mt-1">
                          {caseItem.title}
                        </p>
                      </div>
                      {caseItem.next_hearing_date && (
                        <div className="flex items-center gap-1 ml-2 bg-white px-2 py-1 rounded border border-blue-300">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-900">
                            {(() => {
                              const [, timePart] = caseItem.next_hearing_date
                                .split("T");
                              if (timePart) {
                                const [hours, minutes] = timePart.split(":");
                                return `${hours}:${minutes} IST`;
                              }
                              return "";
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                      <div>
                        <p className="text-gray-500">Court</p>
                        <p className="font-medium text-gray-700">
                          {caseItem.court_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Status</p>
                        <p className="font-medium text-gray-700 capitalize">
                          {caseItem.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
            : (
              <div className="py-8 text-center">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No other cases scheduled for today
                </p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
