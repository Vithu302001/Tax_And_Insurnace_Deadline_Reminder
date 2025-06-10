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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import type { ReminderFormData, Reminder } from "@/lib/types";
import { useState } from "react";

const reminderFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
  type: z.enum(["tax", "insurance"], { required_error: "Please select a reminder type." }),
  policyNumber: z.string().max(50).optional(),
  insurer: z.string().max(100).optional(),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }).optional(),
  expiryDate: z.date({ required_error: "Expiry date is required." }),
});

interface ReminderFormProps {
  onSubmit: (data: ReminderFormData) => Promise<void>;
  initialData?: Reminder | null;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function ReminderForm({
  onSubmit,
  initialData,
  isSubmitting = false,
  submitButtonText = "Save Reminder",
}: ReminderFormProps) {
  const form = useForm<z.infer<typeof reminderFormSchema>>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || undefined,
      policyNumber: initialData?.policyNumber || "",
      insurer: initialData?.insurer || "",
      amount: initialData?.amount || undefined,
      expiryDate: initialData?.expiryDate ? new Date(initialData.expiryDate) : undefined,
    },
  });

  const [isInsurance, setIsInsurance] = useState(initialData?.type === 'insurance');

  const handleTypeChange = (value: "tax" | "insurance") => {
    form.setValue("type", value);
    setIsInsurance(value === 'insurance');
    if (value === 'tax') {
      form.setValue("policyNumber", undefined);
      form.setValue("insurer", undefined);
    }
  };
  
  async function handleSubmit(values: z.infer<typeof reminderFormSchema>) {
    await onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reminder Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Car Insurance Renewal" {...field} />
              </FormControl>
              <FormDescription>A short, descriptive name for this reminder.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={(value: "tax" | "insurance") => handleTypeChange(value)} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reminder type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="tax">Tax</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isInsurance && (
          <>
            <FormField
              control={form.control}
              name="policyNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="POL123456789" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="insurer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurer (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Example Insurance Co." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (Optional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="100.00" {...field} 
                  value={field.value === undefined || field.value === null ? '' : field.value}
                  onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                />
              </FormControl>
              <FormDescription>The amount due for this item, if applicable.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expiry Date</FormLabel>
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
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) } // Disable past dates
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>The date when this item expires or is due.</FormDescription>
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
