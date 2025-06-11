
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getUserPhoneNumber, setUserPhoneNumberInFirestore } from "@/lib/firebase/firestore";
import { PhoneNumberForm } from "@/components/forms/PhoneNumberForm";
import type { PhoneNumberFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Settings as SettingsIcon } from "lucide-react";

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState<string | null>(null);
  const [isLoadingNumber, setIsLoadingNumber] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setIsLoadingNumber(true);
      getUserPhoneNumber(user.uid)
        .then(setCurrentPhoneNumber)
        .catch(error => {
          console.error("Failed to fetch phone number:", error);
          toast({
            title: "Error",
            description: "Could not load your current phone number.",
            variant: "destructive",
          });
        })
        .finally(() => setIsLoadingNumber(false));
    }
  }, [user, toast]);

  const handleSubmit = async (data: PhoneNumberFormData) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await setUserPhoneNumberInFirestore(user.uid, data.phoneNumber);
      setCurrentPhoneNumber(data.phoneNumber); // Update UI with new number
      toast({ title: "Success", description: "Phone number updated successfully." });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update phone number.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <SettingsIcon className="h-8 w-8 mr-3 text-primary" /> Account Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-headline">WhatsApp Notifications</CardTitle>
          <CardDescription>
            Update your phone number to receive WhatsApp reminders for your vehicle expiries.
            Ensure the number is in E.164 format (e.g., +12223334444).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingNumber ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PhoneNumberForm
              onSubmit={handleSubmit}
              initialPhoneNumber={currentPhoneNumber}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
