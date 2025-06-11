
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Users } from "lucide-react";
import type { VehicleFormData, Vehicle, Member } from "@/lib/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { getUserMembers } from "@/lib/firebase/firestore";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const vehicleFormSchema = z.object({
  model: z.string().min(2, { message: "Model must be at least 2 characters." }).max(100),
  registrationNumber: z.string().min(3, {message: "Registration number must be at least 3 characters."}).max(20, {message: "Registration number too long."}),
  taxExpiryDate: z.date({ required_error: "Tax expiry date is required." }),
  insuranceExpiryDate: z.date({ required_error: "Insurance expiry date is required." }),
  insuranceCompany: z.string().max(100).optional().nullable(),
  memberId: z.string().optional().nullable(),
});

interface VehicleFormProps {
  onSubmit: (data: VehicleFormData) => Promise<void>;
  initialData?: Vehicle | null;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function VehicleForm({
  onSubmit,
  initialData,
  isSubmitting = false,
  submitButtonText = "Save Vehicle",
}: VehicleFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (user) {
      setIsLoadingMembers(true);
      getUserMembers(user.uid)
        .then(setMembers)
        .catch(error => {
          toast({ title: "Error", description: "Could not load members for selection.", variant: "destructive"});
          console.error("Failed to fetch members:", error);
        })
        .finally(() => setIsLoadingMembers(false));
    }
  }, [user, toast]);

  const form = useForm<z.infer<typeof vehicleFormSchema>>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      model: initialData?.model || "",
      registrationNumber: initialData?.registrationNumber || "",
      taxExpiryDate: initialData?.taxExpiryDate ? new Date(initialData.taxExpiryDate) : undefined,
      insuranceExpiryDate: initialData?.insuranceExpiryDate ? new Date(initialData.insuranceExpiryDate) : undefined,
      insuranceCompany: initialData?.insuranceCompany || "",
      memberId: initialData?.memberId || undefined,
    },
  });
  
  async function handleSubmit(values: z.infer<typeof vehicleFormSchema>) {
    // Ensure optional fields that are empty strings are converted to null for Firestore consistency if needed by backend
    const dataToSubmit: VehicleFormData = {
      ...values,
      insuranceCompany: values.insuranceCompany || undefined, // Keep undefined if empty string, firestore handles it
      memberId: values.memberId === "none" || !values.memberId ? undefined : values.memberId,
    };
    await onSubmit(dataToSubmit);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vehicle Model</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Honda CB350" {...field} />
              </FormControl>
              <FormDescription>Enter the make and model of the vehicle.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="registrationNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., MH12AB1234" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="taxExpiryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tax Expiry Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>The date when the vehicle's tax expires.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="insuranceExpiryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Insurance Expiry Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                     disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>The date when the vehicle's insurance expires.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="insuranceCompany"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance Company (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., HDFC ERGO" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign to Member (Optional)</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || undefined}
                disabled={isLoadingMembers}
              >
                <FormControl>
                  <SelectTrigger>
                    {isLoadingMembers ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <SelectValue placeholder="Select a member" />
                    )}
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Member / Unassign</SelectItem>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Assign this vehicle to a family member.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting || isLoadingMembers} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground sm:w-auto">
          {(isSubmitting || isLoadingMembers) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}

