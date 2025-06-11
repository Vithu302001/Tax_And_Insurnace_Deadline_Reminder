
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { getUserVehicles } from "@/lib/firebase/firestore";
import { logout } from "@/lib/firebase/auth";
import type { Vehicle } from "@/lib/types";
import { VehicleList } from "@/components/dashboard/VehicleList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  PlusCircle,
  Settings,
  LogOut,
  Car,
  ListChecks,
  AlertTriangle,
  CalendarClock,
  CalendarX2,
  BellRing,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { differenceInDays, parseISO } from "date-fns";
import { sendSummaryEmailAction } from "@/app/(app)/actions/sendSummaryEmailAction";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StatCounts = {
  totalActive: number;
  urgent: number;
  upcoming: number;
  expired: number;
};

type ActiveFilter = "all" | "urgent" | "upcoming" | "expired";

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


export default function DashboardPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [indexCreationUrl, setIndexCreationUrl] = useState<string | null>(null);

  const fetchVehicles = async () => {
    if (!user) return;
    setIsLoading(true);
    setIndexCreationUrl(null);
    try {
      const userVehicles = await getUserVehicles(user.uid);
      setVehicles(userVehicles);
    } catch (error: any) {
      const url = extractMarkedUrl(error.message);
      if (url) {
        setIndexCreationUrl(url);
        toast({
          title: "Firestore Index Required",
          description: "A Firestore index is needed to display vehicles. Please create it using the link shown on the page.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        console.log(error.message);
        toast({
          title: "Error fetching vehicles",
          description: error.message || "Could not load your vehicles.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  const getDaysUntil = (expiryDate: Date | string) => {
    const date = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
    return differenceInDays(date, new Date());
  };

  const getVehicleOverallDaysLeft = (vehicle: Vehicle): number => {
    const daysLeftTax = getDaysUntil(vehicle.taxExpiryDate);
    const daysLeftInsurance = getDaysUntil(vehicle.insuranceExpiryDate);
    return Math.min(daysLeftTax, daysLeftInsurance);
  };

  useEffect(() => {
    if (vehicles.length > 0) {
      let urgentCount = 0;
      let upcomingCount = 0;
      let expiredCount = 0;
      let activeCount = 0;

      vehicles.forEach(v => {
        const overallDaysLeft = getVehicleOverallDaysLeft(v);
        if (overallDaysLeft < 0) {
          expiredCount++;
        } else {
          activeCount++;
          if (overallDaysLeft <= 7) {
            urgentCount++;
          } else if (overallDaysLeft <= 30) {
            upcomingCount++;
          }
        }
      });
      setStats({ totalActive: activeCount, urgent: urgentCount, upcoming: upcomingCount, expired: expiredCount });
    } else {
      setStats({ totalActive: 0, urgent: 0, upcoming: 0, expired: 0 });
    }
  }, [vehicles]);

  const displayedVehicles = useMemo(() => {
    if (activeFilter === "all") return vehicles;
    return vehicles.filter(v => {
      const overallDaysLeft = getVehicleOverallDaysLeft(v);
      if (activeFilter === "urgent") return overallDaysLeft >= 0 && overallDaysLeft <= 7;
      if (activeFilter === "upcoming") return overallDaysLeft > 7 && overallDaysLeft <= 30;
      if (activeFilter === "expired") return overallDaysLeft < 0;
      return true;
    });
  }, [vehicles, activeFilter]);

  const handleDeleteVehicle = (deletedVehicleId: string) => {
    const updatedVehicles = vehicles.filter(v => v.id !== deletedVehicleId);
    setVehicles(updatedVehicles);
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

  const handleSendSummaryEmail = async () => {
    if (!user || !user.email) {
      toast({ title: "Error", description: "User email not found. Cannot send summary.", variant: "destructive"});
      return;
    }
    setIsSendingEmail(true);
    try {
      const result = await sendSummaryEmailAction(user.uid, user.email, user.displayName);
      if (result.success) {
        toast({ title: "Success", description: result.message });
      } else {
        toast({ title: "Error sending email", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "An unexpected error occurred while sending the summary email.", variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
           <Car className="h-8 w-8 mr-3 text-primary" /> Vehicle DeadlineMind
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your vehicle tax and insurance expiry dates effectively.
        </p>
      </div>

      <Card className="mb-6 shadow-md">
        <CardContent className="p-4 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 py-3"
            onClick={handleSendSummaryEmail}
            disabled={isSendingEmail}
          >
            {isSendingEmail ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Mail className="mr-3 h-5 w-5" />}
            Send Summary Report
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 py-3" disabled>
            <BellRing className="mr-3 h-5 w-5" /> Notification Settings (Soon)
          </Button>
           <Button variant="ghost" asChild className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 py-3">
            <Link href="/settings">
              <Settings className="mr-3 h-5 w-5" /> Account Settings
            </Link>
          </Button>
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 py-3">
            <LogOut className="mr-3 h-5 w-5" /> Logout
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
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
          <Link href="/vehicles/add">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Vehicle
          </Link>
        </Button>
      </div>

      {indexCreationUrl && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Firestore Index Required</AlertTitle>
          <AlertDescription>
            To display your vehicles, a Firestore index needs to be created. Please click the link below and then click "Create Index" in the Firebase console:
            <br />
            <a href={indexCreationUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-destructive-foreground/80">
              {indexCreationUrl}
            </a>
            <br />
            After the index is created (usually takes a few minutes), please refresh this page.
          </AlertDescription>
        </Alert>
      )}

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
                {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Vehicles
            </CardTitle>
            <CardDescription>
                {activeFilter === 'all' && 'All your registered vehicles.'}
                {activeFilter === 'urgent' && 'Vehicles needing immediate attention for renewals.'}
                {activeFilter === 'upcoming' && 'Vehicles with renewals due in the near future.'}
                {activeFilter === 'expired' && 'Vehicles with one or more expired documents.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && vehicles.length === 0 && !indexCreationUrl ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <VehicleList vehicles={displayedVehicles} onDelete={handleDeleteVehicle} />
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground mt-8 text-center">
        <strong>Note:</strong> Some features like billing are not yet implemented.
      </p>
    </div>
  );
}
