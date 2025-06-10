
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import type { VehicleFormData, Vehicle } from "@/lib/types";

const vehicleFormSchema = z.object({
  model: z.string().min(2, { message: "Model must be at least 2 characters." }).max(100),
  registrationNumber: z.string().min(3, {message: "Registration number must be at least 3 characters."}).max(20, {message: "Registration number too long."}),
  taxExpiryDate: z.date({ required_error: "Tax expiry date is required." }),
  insuranceExpiryDate: z.date({ required_error: "Insurance expiry date is required." }),
  insuranceCompany: z.string().max(100).optional(),
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
  const form = useForm<z.infer<typeof vehicleFormSchema>>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      model: initialData?.model || "",
      registrationNumber: initialData?.registrationNumber || "",
      taxExpiryDate: initialData?.taxExpiryDate ? new Date(initialData.taxExpiryDate) : undefined,
      insuranceExpiryDate: initialData?.insuranceExpiryDate ? new Date(initialData.insuranceExpiryDate) : undefined,
      insuranceCompany: initialData?.insuranceCompany || "",
    },
  });
  
  async function handleSubmit(values: z.infer<typeof vehicleFormSchema>) {
    await onSubmit(values);
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
        
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground sm:w-auto">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
