"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing } from "lucide-react";
import { getNamespace } from "../../config/socket";
import api from "@/lib/api";
import toast from "react-hot-toast";
import useAuthStore from "@/store/auth.store";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuthStore();
  const router = useRouter();

  const fetchUnreadCount = async () => {
    try {
      if (!user) return;
      const { data } = await api.get("/api/notifications/unread-count");
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    if (!user) return;

    const notificationsNs = getNamespace("/notifications");
    notificationsNs.emit("join", user._id);

    const handleNewNotification = (payload) => {
      setUnreadCount((prev) => prev + 1);

      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-sm w-full pointer-events-auto flex rounded-xl overflow-hidden`}
          style={{
            background: '#282a2c',
            border: '1px solid #3c4043',
          }}
        >
          <div className="flex-1 w-0 p-3">
            <div className="flex items-start gap-2.5">
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#8ab4f8', color: '#131314' }}>
                <BellRing className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#e8eaed] truncate">{payload.title}</p>
                <p className="text-[11px] text-[#9aa0a6] mt-0.5 line-clamp-2">{payload.message}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              if (payload.link) router.push(payload.link);
            }}
            className="px-3 text-[12px] font-medium text-[#8ab4f8] hover:bg-[#8ab4f8]/10 transition-colors"
            style={{ borderLeft: '1px solid #3c4043' }}
          >
            View
          </button>
        </div>
      ), { duration: 4000 });
    };

    notificationsNs.on("notification_push", handleNewNotification);

    return () => {
      notificationsNs.off("notification_push", handleNewNotification);
    };
  }, [user]);

  const goToNotifications = () => {
    if (user?.role) {
      router.push(`/${user.role}/notifications`);
    }
  };

  return (
    <button
      onClick={goToNotifications}
      className="relative p-1.5 rounded-lg text-[#9aa0a6] hover:bg-[#282a2c] hover:text-[#e8eaed] transition-colors"
    >
      {unreadCount > 0 ? (
        <BellRing className="w-5 h-5 animate-ring" />
      ) : (
        <Bell className="w-5 h-5" />
      )}

      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
          style={{ background: '#f28b82', color: '#131314' }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
