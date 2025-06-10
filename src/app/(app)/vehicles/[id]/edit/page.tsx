
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getVehicleById, updateVehicle } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Vehicle, VehicleFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function EditVehiclePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && vehicleId) {
      const fetchVehicle = async () => {
        setIsLoading(true);
        try {
          const fetchedVehicle = await getVehicleById(vehicleId, user.uid);
          if (fetchedVehicle) {
            setVehicle(fetchedVehicle);
          } else {
            toast({ title: "Error", description: "Vehicle not found or access denied.", variant: "destructive" });
            router.push("/dashboard");
          }
        } catch (error: any) {
          toast({ title: "Error", description: error.message || "Failed to load vehicle.", variant: "destructive" });
          router.push("/dashboard");
        } finally {
          setIsLoading(false);
        }
      };
      fetchVehicle();
    }
  }, [user, vehicleId, toast, router]);

  const handleSubmit = async (data: VehicleFormData) => {
    if (!user || !vehicleId) {
      toast({ title: "Error", description: "User or vehicle ID is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateVehicle(vehicleId, user.uid, data);
      toast({ title: "Success", description: "Vehicle updated successfully." });
      router.push("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update vehicle.", variant: "destructive" });
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

  if (!vehicle) {
    return <p className="text-center text-muted-foreground">Vehicle not found.</p>;
  }
  
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Edit Vehicle</CardTitle>
          <CardDescription>Update the details for your vehicle.</CardDescription>
        </CardHeader>
        <CardContent>
          <VehicleForm 
            onSubmit={handleSubmit} 
            initialData={vehicle} 
            isSubmitting={isSubmitting}
            submitButtonText="Update Vehicle"
          />
        </CardContent>
      </Card>
    </div>
  );
}
