"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ReminderForm } from "@/components/forms/ReminderForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getReminderById, updateReminder } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Reminder, ReminderFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function EditReminderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const reminderId = params.id as string;

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && reminderId) {
      const fetchReminder = async () => {
        setIsLoading(true);
        try {
          const fetchedReminder = await getReminderById(reminderId, user.uid);
          if (fetchedReminder) {
            setReminder(fetchedReminder);
          } else {
            toast({ title: "Error", description: "Reminder not found or access denied.", variant: "destructive" });
            router.push("/dashboard");
          }
        } catch (error: any) {
          toast({ title: "Error", description: error.message || "Failed to load reminder.", variant: "destructive" });
          router.push("/dashboard");
        } finally {
          setIsLoading(false);
        }
      };
      fetchReminder();
    }
  }, [user, reminderId, toast, router]);

  const handleSubmit = async (data: ReminderFormData) => {
    if (!user || !reminderId) {
      toast({ title: "Error", description: "User or reminder ID is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      // For renewal, typical use case is just updating expiry date.
      // User might also want to update amount or other details.
      const updatedData: Partial<ReminderFormData> = {
        ...data,
        // If it's a renewal, the expiry date should be updated to next year (or user input)
        // This form allows user to set any future date.
      };
      await updateReminder(reminderId, user.uid, updatedData);
      toast({ title: "Success", description: "Reminder updated successfully." });
      router.push("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update reminder.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!reminder) {
    return <p className="text-center text-muted-foreground">Reminder not found.</p>;
  }
  
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Edit Reminder</CardTitle>
          <CardDescription>Update the details for your reminder. To renew, simply set a new expiry date.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReminderForm 
            onSubmit={handleSubmit} 
            initialData={reminder} 
            isSubmitting={isSubmitting}
            submitButtonText="Update Reminder"
          />
        </CardContent>
      </Card>
    </div>
  );
}
