
"use client";

import { MemberForm } from "@/components/forms/MemberForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addMember } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import type { MemberFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddMemberPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: MemberFormData) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to add a member.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addMember(user.uid, data);
      toast({ title: "Success", description: "Member added successfully." });
      router.push("/members"); 
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add member.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Add New Member</CardTitle>
          <CardDescription>Enter the details for the new family member.</CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitButtonText="Add Member" />
        </CardContent>
      </Card>
    </div>
  );
}
