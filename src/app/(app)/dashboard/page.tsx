"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getUserReminders } from "@/lib/firebase/firestore";
import type { Reminder } from "@/lib/types";
import { ReminderList } from "@/components/dashboard/ReminderList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

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
  
  const handleDeleteReminder = (deletedReminderId: string) => {
    setReminders(prevReminders => prevReminders.filter(r => r.id !== deletedReminderId));
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="text-2xl font-headline">Your Reminders</CardTitle>
            <CardDescription>
              View and manage your upcoming tax and insurance deadlines.
            </CardDescription>
          </div>
          <Button asChild className="mt-4 sm:mt-0 bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/reminders/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Reminder
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <ReminderList reminders={reminders} onDelete={handleDeleteReminder} />
          )}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground mt-8 text-center">
        <strong>Note:</strong> Email reminders (e.g., 30, 14, 7, 1 day before expiry) are a backend feature. 
        This UI allows managing reminder data; the actual email sending service would be set up separately.
      </p>
    </div>
  );
}
