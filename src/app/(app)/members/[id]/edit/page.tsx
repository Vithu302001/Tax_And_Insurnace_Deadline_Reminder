
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MemberForm } from "@/components/forms/MemberForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getMemberById, updateMember } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Member, MemberFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function EditMemberPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && memberId) {
      const fetchMember = async () => {
        setIsLoading(true);
        try {
          const fetchedMember = await getMemberById(memberId, user.uid);
          if (fetchedMember) {
            setMember(fetchedMember);
          } else {
            toast({ title: "Error", description: "Member not found or access denied.", variant: "destructive" });
            router.push("/members");
          }
        } catch (error: any) {
          toast({ title: "Error", description: error.message || "Failed to load member.", variant: "destructive" });
          router.push("/members");
        } finally {
          setIsLoading(false);
        }
      };
      fetchMember();
    }
  }, [user, memberId, toast, router]);

  const handleSubmit = async (data: MemberFormData) => {
    if (!user || !memberId) {
      toast({ title: "Error", description: "User or member ID is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateMember(memberId, user.uid, data);
      toast({ title: "Success", description: "Member updated successfully." });
      router.push("/members");
    } catch (error: any)      toast({ title: "Error", description: error.message || "Failed to update member.", variant: "destructive" });
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

  if (!member) {
    return <p className="text-center text-muted-foreground">Member not found.</p>;
  }
  
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Edit Member</CardTitle>
          <CardDescription>Update the details for this member.</CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm 
            onSubmit={handleSubmit} 
            initialData={member} 
            isSubmitting={isSubmitting}
            submitButtonText="Update Member"
          />
        </CardContent>
      </Card>
    </div>
  );
}
