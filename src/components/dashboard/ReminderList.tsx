"use client";

import { useState, useMemo, useEffect } from "react";
import type { Reminder } from "@/lib/types";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Search, Filter, ArrowUpDown, CalendarDays } from "lucide-react";
import Link from "next/link";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteReminder as deleteReminderFromDb } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";

interface ReminderListProps {
  reminders: Reminder[];
  onDelete: (reminderId: string) => void;
}

type SortKey = keyof Pick<Reminder, "name" | "expiryDate" | "type" | "amount">;
type SortDirection = "asc" | "desc";

export function ReminderList({ reminders: initialReminders, onDelete }: ReminderListProps) {
  const [reminders, setReminders] = useState(initialReminders);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("expiryDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [typeFilter, setTypeFilter] = useState<Array<'tax' | 'insurance'>>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);


  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getDaysUntilExpiry = (expiryDate: Date | string) => {
    const date = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
    return differenceInDays(date, new Date());
  };

  const getStatusBadge = (expiryDate: Date | string) => {
    const daysLeft = getDaysUntilExpiry(expiryDate);
    if (daysLeft < 0) return <Badge variant="destructive">Expired</Badge>;
    if (daysLeft <= 7) return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">Urgent</Badge>;
    if (daysLeft <= 30) return <Badge variant="secondary" className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500">Upcoming</Badge>;
    return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Safe</Badge>;
  };
  
  const filteredAndSortedReminders = useMemo(() => {
    let filtered = [...reminders];

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.policyNumber && r.policyNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (r.insurer && r.insurer.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (typeFilter.length > 0) {
        filtered = filtered.filter(r => typeFilter.includes(r.type));
    }

    return filtered.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === 'expiryDate') {
        valA = new Date(a.expiryDate).getTime();
        valB = new Date(b.expiryDate).getTime();
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

      // Fallback for mixed types or other cases
      const strA = String(valA);
      const strB = String(valB);
      return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [reminders, searchTerm, sortKey, sortDirection, typeFilter]);

  const handleDelete = async (reminderId: string) => {
    if (!user) {
      toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
      return;
    }
    try {
      await deleteReminderFromDb(reminderId, user.uid);
      onDelete(reminderId); // Propagate to parent to update state
      setReminders(prev => prev.filter(r => r.id !== reminderId)); // Optimistic update local state
      toast({ title: "Success", description: "Reminder deleted." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete reminder.", variant: "destructive" });
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
            placeholder="Search reminders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" /> Filter by Type
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {['tax', 'insurance'].map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={typeFilter.includes(type as 'tax' | 'insurance')}
                onCheckedChange={(checked) => {
                  setTypeFilter(prev => 
                    checked 
                    ? [...prev, type as 'tax' | 'insurance'] 
                    : prev.filter(t => t !== type)
                  );
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filteredAndSortedReminders.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <CalendarDays className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg">No reminders found.</p>
          <p>Try adjusting your search or filters, or add a new reminder!</p>
        </div>
      ) : (
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader columnKey="name" label="Name" />
              <SortableHeader columnKey="type" label="Type" />
              <SortableHeader columnKey="expiryDate" label="Expiry Date" />
              <TableHead>Status</TableHead>
              <SortableHeader columnKey="amount" label="Amount" />
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedReminders.map((reminder) => (
              <TableRow key={reminder.id}>
                <TableCell className="font-medium">{reminder.name}</TableCell>
                <TableCell>
                  <Badge variant={reminder.type === 'tax' ? 'secondary' : 'default'}>
                    {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{format(new Date(reminder.expiryDate), "MMM dd, yyyy")}</TableCell>
                <TableCell>{getStatusBadge(reminder.expiryDate)}</TableCell>
                <TableCell>
                  {reminder.amount !== undefined ? `$${reminder.amount.toFixed(2)}` : "N/A"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" asChild title="Edit">
                      <Link href={`/reminders/${reminder.id}/edit`}>
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
                            This action cannot be undone. This will permanently delete the reminder
                            "{reminder.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(reminder.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
