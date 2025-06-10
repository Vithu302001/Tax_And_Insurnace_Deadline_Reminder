
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { getUserReminders } from "@/lib/firebase/firestore";
import { logout } from "@/lib/firebase/auth";
import type { Reminder } from "@/lib/types";
import { ReminderList } from "@/components/dashboard/ReminderList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  PlusCircle, 
  Settings, 
  LogOut, 
  Shield, 
  ListChecks, 
  AlertTriangle, 
  CalendarClock, 
  CalendarX2,
  Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { differenceInDays, parseISO } from "date-fns";

type StatCounts = {
  totalActive: number;
  urgent: number;
  upcoming: number;
  expired: number;
};

type ActiveFilter = "all" | "urgent" | "upcoming" | "expired";

export default function DashboardPage() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const [stats, setStats] = useState<StatCounts>({
    totalActive: 0,
    urgent: 0,
    upcoming: 0,
    expired: 0,
  });
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  const fetchReminders = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userReminders = await getUserReminders(user.uid);
      setReminders(userReminders);
    } catch (error: any) {
      toast({
        title: "Error fetching reminders",
        description: error.message || "Could not load your reminders.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const getDaysUntil = (expiryDate: Date | string) => {
    const date = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
    return differenceInDays(date, new Date());
  };

  useEffect(() => {
    if (reminders.length > 0) {
      let urgentCount = 0;
      let upcomingCount = 0;
      let expiredCount = 0;
      let activeCount = 0;

      reminders.forEach(r => {
        const daysLeft = getDaysUntil(r.expiryDate);
        if (daysLeft < 0) {
          expiredCount++;
        } else {
          activeCount++;
          if (daysLeft <= 7) {
            urgentCount++;
          } else if (daysLeft <= 30) {
            upcomingCount++;
          }
        }
      });
      setStats({ totalActive: activeCount, urgent: urgentCount, upcoming: upcomingCount, expired: expiredCount });
    } else {
      setStats({ totalActive: 0, urgent: 0, upcoming: 0, expired: 0 });
    }
  }, [reminders]);

  const displayedReminders = useMemo(() => {
    if (activeFilter === "all") return reminders;
    return reminders.filter(r => {
      const daysLeft = getDaysUntil(r.expiryDate);
      if (activeFilter === "urgent") return daysLeft >= 0 && daysLeft <= 7;
      if (activeFilter === "upcoming") return daysLeft > 7 && daysLeft <= 30;
      if (activeFilter === "expired") return daysLeft < 0;
      return true;
    });
  }, [reminders, activeFilter]);
  
  const handleDeleteReminder = (deletedReminderId: string) => {
    const updatedReminders = reminders.filter(r => r.id !== deletedReminderId);
    setReminders(updatedReminders);
    // Optionally, you might want to show a toast message here if not handled by ReminderList itself
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push("/login");
    } catch (error) {
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
           <Bell className="h-8 w-8 mr-3 text-primary" /> DeadlineMind Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your tax and insurance expiry dates effectively.
        </p>
      </div>

      <Card className="mb-6 shadow-md">
        <CardContent className="p-4 space-y-1">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 py-3">
            <Bell className="mr-3 h-5 w-5" /> Notification Settings (Soon)
          </Button>
           <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 py-3">
            <Settings className="mr-3 h-5 w-5" /> Account Settings (Soon)
          </Button>
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 py-3">
            <LogOut className="mr-3 h-5 w-5" /> Logout
          </Button>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Reminders</CardTitle>
            <ListChecks className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalActive}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.urgent}</div>
            <p className="text-xs text-muted-foreground">&lt;= 7 days left</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CalendarClock className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">8-30 days left</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <CalendarX2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <Button asChild size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md">
          <Link href="/reminders/add">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Reminder
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "urgent", "upcoming", "expired"] as ActiveFilter[]).map((filter) => (
          <Button
            key={filter}
            variant={activeFilter === filter ? "default" : "outline"}
            onClick={() => setActiveFilter(filter)}
            className="shadow-sm"
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Button>
        ))}
      </div>
      
      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="text-xl font-headline">
                {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Reminders
            </CardTitle>
            <CardDescription>
                {activeFilter === 'all' && 'All your scheduled reminders.'}
                {activeFilter === 'urgent' && 'Reminders needing immediate attention.'}
                {activeFilter === 'upcoming' && 'Reminders due in the near future.'}
                {activeFilter === 'expired' && 'Reminders that have passed their due date.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && reminders.length === 0 ? ( // Show main loader only if truly loading initial data
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <ReminderList reminders={displayedReminders} onDelete={handleDeleteReminder} />
          )}
        </CardContent>
      </Card>
      
      <p className="text-sm text-muted-foreground mt-8 text-center">
        <strong>Note:</strong> Email reminders are a backend feature. 
        This UI allows managing reminder data.
      </p>
    </div>
  );
}

