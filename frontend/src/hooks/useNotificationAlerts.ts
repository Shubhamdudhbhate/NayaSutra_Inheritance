import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Notification {
  id: string;
  user_id: string;
  case_id?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  priority?: string;
  requires_confirmation?: boolean;
}

interface UseNotificationAlertsOptions {
  userId: string | undefined;
  enabled?: boolean;
  showToasts?: boolean;
}

export const useNotificationAlerts = ({
  userId,
  enabled = true,
  showToasts = true,
}: UseNotificationAlertsOptions) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const previousCountRef = useRef(0);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch initial notification count
  const fetchNotificationCount = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select("id, title, message, is_read, created_at, priority, requires_confirmation")
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;

      const count = notifications?.length || 0;
      
      // Check if we have new notifications (count increased)
      if (count > previousCountRef.current && previousCountRef.current > 0) {
        setHasNewNotification(true);
        
        // Get the latest notification for toast
        const latest = notifications?.[0];
        if (latest && showToasts) {
          setLatestNotification(latest as Notification);
          showNotificationToast(latest as Notification);
        }

        // Reset the animation flag after 3 seconds
        setTimeout(() => setHasNewNotification(false), 3000);
      }

      previousCountRef.current = count;
      setNotificationCount(count);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [userId, showToasts]);

  // Show toast notification - using simple toast without JSX
  const showNotificationToast = (notification: Notification) => {
    const actionRequired = notification.requires_confirmation ? " (Action Required)" : "";
    const icon = notification.requires_confirmation ? "⚠️ " : "🔔 ";
    
    toast.info(
      `${icon}${notification.title}${actionRequired}`,
      {
        description: notification.message,
        duration: 8000,
        action: {
          label: "View",
          onClick: () => {
            window.location.href = "/notifications";
          },
        },
      }
    );
  };

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      setNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      setNotificationCount(0);
      setHasNewNotification(false);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [userId]);

  // Set up realtime subscription and polling
  useEffect(() => {
    if (!userId || !enabled) return;

    // Initial fetch
    fetchNotificationCount();

    // Poll for new notifications every 3 seconds (more frequent for responsiveness)
    const pollInterval = setInterval(fetchNotificationCount, 3000);

    // Set up realtime subscription for instant updates
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("📨 New notification received via realtime:", payload);
          
          const newNotification = payload.new as Notification;
          
          // Update count
          setNotificationCount((prev) => prev + 1);
          setHasNewNotification(true);
          setLatestNotification(newNotification);
          
          // Show toast
          if (showToasts) {
            showNotificationToast(newNotification);
          }

          // Reset animation after 3 seconds
          setTimeout(() => setHasNewNotification(false), 3000);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      clearInterval(pollInterval);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [userId, enabled, fetchNotificationCount, showToasts]);

  return {
    notificationCount,
    hasNewNotification,
    latestNotification,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotificationCount,
  };
};

export default useNotificationAlerts;
