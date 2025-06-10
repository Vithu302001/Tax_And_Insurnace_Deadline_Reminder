
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Vehicle } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Search, ArrowUpDown, CalendarDays, Car, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import Link from "next/link";
import { format, differenceInDays, parseISO, isBefore } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteVehicle as deleteVehicleFromDb } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";

interface VehicleListProps {
  vehicles: Vehicle[];
  onDelete: (vehicleId: string) => void;
}

type SortKey = keyof Pick<Vehicle, "model" | "registrationNumber" | "taxExpiryDate" | "insuranceExpiryDate" | "insuranceCompany">;
type SortDirection = "asc" | "desc";

export function VehicleList({ vehicles: initialVehicles, onDelete }: VehicleListProps) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("taxExpiryDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setVehicles(initialVehicles);
  }, [initialVehicles]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getDaysUntil = (expiryDate: Date | string) => {
    const date = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
    return differenceInDays(date, new Date());
  };

  const getStatusForDate = (expiryDate: Date | string): { daysLeft: number; status: 'expired' | 'urgent' | 'upcoming' | 'safe'; badge: JSX.Element } => {
    const daysLeft = getDaysUntil(expiryDate);
    if (daysLeft < 0) return { daysLeft, status: 'expired', badge: <Badge variant="destructive" className="bg-red-700 hover:bg-red-800">Expired</Badge> };
    if (daysLeft <= 7) return { daysLeft, status: 'urgent', badge: <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">Urgent</Badge> };
    if (daysLeft <= 30) return { daysLeft, status: 'upcoming', badge: <Badge variant="secondary" className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500">Upcoming</Badge> };
    return { daysLeft, status: 'safe', badge: <Badge variant="default" className="bg-green-500 hover:bg-green-600">Safe</Badge> };
  };
  
  const filteredAndSortedVehicles = useMemo(() => {
    let filtered = [...vehicles];

    if (searchTerm) {
      filtered = filtered.filter(
        (v) =>
          v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (v.insuranceCompany && v.insuranceCompany.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === 'taxExpiryDate' || sortKey === 'insuranceExpiryDate') {
        valA = new Date(a[sortKey]).getTime();
        valB = new Date(b[sortKey]).getTime();
      }
      
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
         return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [vehicles, searchTerm, sortKey, sortDirection]);

  const handleDelete = async (vehicleId: string) => {
    if (!user) {
      toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
      return;
    }
    try {
      await deleteVehicleFromDb(vehicleId, user.uid);
      onDelete(vehicleId); 
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      toast({ title: "Success", description: "Vehicle deleted." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete vehicle.", variant: "destructive" });
    }
  };

  const SortableHeader = ({ columnKey, label }: { columnKey: SortKey; label: string }) => (
    <TableHead onClick={() => handleSort(columnKey)} className="cursor-pointer hover:bg-muted/50">
      <div className="flex items-center">
        {label}
        {sortKey === columnKey && (
          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "asc" ? "" : "rotate-180"}`} />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vehicles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full"
          />
        </div>
      </div>

      {filteredAndSortedVehicles.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Car className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg">No vehicles found.</p>
          <p>Try adjusting your search, or add a new vehicle!</p>
        </div>
      ) : (
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader columnKey="model" label="Model" />
              <SortableHeader columnKey="registrationNumber" label="Reg. Number" />
              <SortableHeader columnKey="taxExpiryDate" label="Tax Expiry" />
              <SortableHeader columnKey="insuranceExpiryDate" label="Insurance Expiry" />
              <TableHead>Overall Status</TableHead>
              <SortableHeader columnKey="insuranceCompany" label="Insurer" />
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedVehicles.map((vehicle) => {
              const taxStatus = getStatusForDate(vehicle.taxExpiryDate);
              const insuranceStatus = getStatusForDate(vehicle.insuranceExpiryDate);
              
              let overallStatusBadge = taxStatus.badge;
              let overallStatusText = `Tax: ${taxStatus.status}`;

              if (isBefore(vehicle.insuranceExpiryDate, vehicle.taxExpiryDate)) {
                overallStatusBadge = insuranceStatus.badge;
              }
              if (taxStatus.daysLeft < 0 || insuranceStatus.daysLeft < 0) {
                overallStatusBadge = <Badge variant="destructive" className="bg-red-700 hover:bg-red-800">Expired</Badge>;
              } else if (taxStatus.daysLeft <= 7 || insuranceStatus.daysLeft <= 7) {
                overallStatusBadge = <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">Urgent</Badge>;
              } else if (taxStatus.daysLeft <= 30 || insuranceStatus.daysLeft <= 30) {
                 overallStatusBadge = <Badge variant="secondary" className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500">Upcoming</Badge>;
              } else {
                 overallStatusBadge = <Badge variant="default" className="bg-green-500 hover:bg-green-600">Safe</Badge>;
              }


              return (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.model}</TableCell>
                  <TableCell>{vehicle.registrationNumber}</TableCell>
                  <TableCell>
                    {format(new Date(vehicle.taxExpiryDate), "MMM dd, yyyy")}
                    <div className="mt-1">{taxStatus.badge}</div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(vehicle.insuranceExpiryDate), "MMM dd, yyyy")}
                     <div className="mt-1">{insuranceStatus.badge}</div>
                  </TableCell>
                  <TableCell>{overallStatusBadge}</TableCell>
                  <TableCell>{vehicle.insuranceCompany || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" asChild title="Edit">
                        <Link href={`/vehicles/${vehicle.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the vehicle
                              "{vehicle.model} ({vehicle.registrationNumber})".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
