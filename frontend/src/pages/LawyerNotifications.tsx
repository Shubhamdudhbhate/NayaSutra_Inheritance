import { NyaySutraSidebar } from "@/components/dashboard/NyaySutraSidebar";
import { NotificationTab } from "@/components/notifications/NotificationTab";

export default function LawyerNotifications() {
  return (
    <div className="flex min-h-screen bg-background">
      <NyaySutraSidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-64">
        <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
              <p className="text-sm text-muted-foreground">Manage your notifications and signing requests</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <NotificationTab />
        </div>
      </div>
    </div>
  );
}
