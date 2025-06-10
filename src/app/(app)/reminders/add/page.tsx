"use client";

import { ReminderForm } from "@/components/forms/ReminderForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addReminder } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import type { ReminderFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddReminderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: ReminderFormData) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to add a reminder.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addReminder(user.uid, data);
      toast({ title: "Success", description: "Reminder added successfully." });
      router.push("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add reminder.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Add New Reminder</CardTitle>
          <CardDescription>Fill in the details for your new tax or insurance reminder.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReminderForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitButtonText="Add Reminder" />
        </CardContent>
      </Card>
    </div>
  );
}
