import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Scale,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Activity,
  Target,
  Gavel,
} from "lucide-react";
import { NyaySutraSidebar } from "@/components/dashboard/NyaySutraSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from "recharts";

const Analytics = () => {
  const { profile } = useAuth(); // Add profile from useAuth
  const [timeRange, setTimeRange] = useState("6months");
  const [, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCases: 0,
    pendingCases: 0,
    disposedCases: 0,
    avgDisposalTime: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, profile?.id]); // Add profile.id dependency

  const fetchAnalytics = async () => {
    if (!profile?.id) {
      console.log("Judge profile not available for analytics");
      return;
    }

    try {
      // Fetch only cases assigned to this judge
      const { data: cases, error } = await supabase
        .from("cases")
        .select("id, status, created_at, updated_at")
        .eq("assigned_judge_id", profile.id); // Only this judge's cases

      if (error) throw error;

      const total = cases?.length || 0;
      const pending = cases?.filter((c) => c.status !== "closed").length || 0;
      const disposed = cases?.filter((c) => c.status === "closed").length || 0;

      setStats({
        totalCases: total,
        pendingCases: pending,
        disposedCases: disposed,
        avgDisposalTime: 45, // Mock average
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data for charts
  const disposalTrendData = [
    { month: "Jul", disposed: 42, filed: 55 },
    { month: "Aug", disposed: 38, filed: 48 },
    { month: "Sep", disposed: 51, filed: 45 },
    { month: "Oct", disposed: 47, filed: 52 },
    { month: "Nov", disposed: 55, filed: 49 },
    { month: "Dec", disposed: 62, filed: 58 },
  ];

  const caseTypeData = [
    { name: "Civil", value: 35, color: "#3b82f6" },
    { name: "Criminal", value: 28, color: "#ef4444" },
    { name: "Writ", value: 22, color: "#f59e0b" },
    { name: "Bail", value: 15, color: "#10b981" },
  ];

  const monthlyPerformance = [
    { month: "Jul", hours: 145 },
    { month: "Aug", hours: 132 },
    { month: "Sep", hours: 158 },
    { month: "Oct", hours: 142 },
    { month: "Nov", hours: 165 },
    { month: "Dec", hours: 178 },
  ];

  const StatCard = ({
    title,
    value,
    change,
    changeType,
    icon: Icon,
    iconColor,
  }: {
    title: string;
    value: string | number;
    change: string;
    changeType: "up" | "down";
    icon: React.ElementType;
    iconColor: string;
  }) => (
    <Card className="card-glass border-border/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <div className={cn("flex items-center gap-1 mt-2 text-sm", changeType === "up" ? "text-emerald-400" : "text-red-400")}>
              {changeType === "up" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{change} from last month</span>
            </div>
          </div>
          <div className={cn("p-3 rounded-xl", iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <NyaySutraSidebar />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              Analytics & Insights
            </h1>
            <p className="text-muted-foreground mt-1">Performance metrics and case statistics</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48 bg-muted/50 border-border">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Cases"
            value={stats.totalCases}
            change="+12%"
            changeType="up"
            icon={Scale}
            iconColor="bg-primary/10 text-primary"
          />
          <StatCard
            title="Cases Disposed"
            value={stats.disposedCases}
            change="+8%"
            changeType="up"
            icon={Gavel}
            iconColor="bg-emerald-500/10 text-emerald-400"
          />
          <StatCard
            title="Pending Cases"
            value={stats.pendingCases}
            change="-5%"
            changeType="down"
            icon={Clock}
            iconColor="bg-amber-500/10 text-amber-400"
          />
          <StatCard
            title="Avg. Disposal Time"
            value={`${stats.avgDisposalTime} days`}
            change="-3 days"
            changeType="up"
            icon={Target}
            iconColor="bg-blue-500/10 text-blue-400"
          />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Disposal Trend Chart */}
          <div className="col-span-8">
            <Card className="card-glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Case Disposal Trend
                  </span>
                  <Badge variant="outline">6 Months</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={disposalTrendData}>
                      <defs>
                        <linearGradient id="colorDisposed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFiled" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="disposed"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorDisposed)"
                        name="Disposed"
                      />
                      <Area
                        type="monotone"
                        dataKey="filed"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorFiled)"
                        name="Filed"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Case Distribution */}
          <div className="col-span-4">
            <Card className="card-glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Case Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={caseTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {caseTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Court Hours */}
          <div className="col-span-6">
            <Card className="card-glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Monthly Court Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="col-span-6">
            <Card className="card-glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Disposal Rate</span>
                    <span className="text-sm font-medium">78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Hearing Attendance</span>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Judgment Delivery Rate</span>
                    <span className="text-sm font-medium">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Case Clearance Rate</span>
                    <span className="text-sm font-medium">96%</span>
                  </div>
                  <Progress value={96} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
