
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { getUserMembers } from "@/lib/firebase/firestore";
import type { Member } from "@/lib/types";
import { MemberList } from "@/components/dashboard/MemberList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, User as UserIcon, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const INDEX_URL_MARKER_START = "MISSING_INDEX_URL_START";
const INDEX_URL_MARKER_END = "MISSING_INDEX_URL_END";

const extractMarkedUrl = (message: string): string | null => {
  const startIndex = message.indexOf(INDEX_URL_MARKER_START);
  const endIndex = message.indexOf(INDEX_URL_MARKER_END);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return message.substring(startIndex + INDEX_URL_MARKER_START.length, endIndex);
  }
  return null;
};

export default function MembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [indexCreationUrl, setIndexCreationUrl] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!user) return;
    setIsLoading(true);
    setIndexCreationUrl(null);
    try {
      const userMembers = await getUserMembers(user.uid);
      setMembers(userMembers);
    } catch (error: any) {
      const url = extractMarkedUrl(error.message);
      if (url) {
        setIndexCreationUrl(url);
        toast({
          title: "Firestore Index Required",
          description: "A Firestore index is needed to display members. Please create it using the link shown on the page.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Error fetching members",
          description: error.message || "Could not load your members.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMembers();
    }
  }, [user]);

  const handleDeleteMember = (deletedMemberId: string) => {
    const updatedMembers = members.filter(m => m.id !== deletedMemberId);
    setMembers(updatedMembers);
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
            <UserIcon className="h-8 w-8 mr-3 text-primary" /> Family Members
            </h1>
            <p className="text-muted-foreground mt-1">
            Manage your family members here.
            </p>
        </div>
        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md">
          <Link href="/members/add">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Member
          </Link>
        </Button>
      </div>

      {indexCreationUrl && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Firestore Index Required</AlertTitle>
          <AlertDescription>
            To display your members, a Firestore index needs to be created. Please click the link below and then click "Create Index" in the Firebase console:
            <br />
            <a href={indexCreationUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-destructive-foreground/80">
              {indexCreationUrl}
            </a>
            <br />
            After the index is created (usually takes a few minutes), please refresh this page.
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="text-xl font-headline">
                All Members
            </CardTitle>
            <CardDescription>
                List of all registered family members.
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && members.length === 0 && !indexCreationUrl ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <MemberList members={members} onDelete={handleDeleteMember} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
