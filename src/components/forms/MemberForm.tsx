
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
import { Loader2 } from "lucide-react";
import type { MemberFormData, Member } from "@/lib/types";

const memberFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
});

interface MemberFormProps {
  onSubmit: (data: MemberFormData) => Promise<void>;
  initialData?: Member | null;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function MemberForm({
  onSubmit,
  initialData,
  isSubmitting = false,
  submitButtonText = "Save Member",
}: MemberFormProps) {
  const form = useForm<z.infer<typeof memberFormSchema>>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      name: initialData?.name || "",
    },
  });
  
  async function handleSubmit(values: z.infer<typeof memberFormSchema>) {
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
              <FormLabel>Member Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
              </FormControl>
              <FormDescription>Enter the name of the family member.</FormDescription>
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
