
"use client";

import { VehicleForm } from "@/components/forms/VehicleForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addVehicle } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import type { VehicleFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddVehiclePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: VehicleFormData) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to add a vehicle.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addVehicle(user.uid, data);
      toast({ title: "Success", description: "Vehicle added successfully." });
      router.push("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add vehicle.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Add New Vehicle</CardTitle>
          <CardDescription>Fill in the details for your new vehicle, including tax and insurance expiry.</CardDescription>
        </CardHeader>
        <CardContent>
          <VehicleForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitButtonText="Add Vehicle" />
        </CardContent>
      </Card>
    </div>
  );
}
