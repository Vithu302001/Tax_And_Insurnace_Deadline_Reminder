
"use client";

import * as React from "react"; // Added React import
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
import { Loader2, Phone } from "lucide-react";
import type { PhoneNumberFormData } from "@/lib/types";

// E.164 format regex (simplified: starts with +, then digits)
const e164Regex = /^\+[1-9]\d{1,14}$/;

const phoneNumberFormSchema = z.object({
  phoneNumber: z.string()
    .min(10, { message: "Phone number seems too short." })
    .max(20, { message: "Phone number seems too long." })
    .refine(value => e164Regex.test(value.replace(/\s+/g, '')), { // Test after removing spaces
      message: "Phone number must be in E.164 format (e.g., +12223334444)."
    }),
});

interface PhoneNumberFormProps {
  onSubmit: (data: PhoneNumberFormData) => Promise<void>;
  initialPhoneNumber?: string | null;
  isSubmitting?: boolean;
}

export function PhoneNumberForm({
  onSubmit,
  initialPhoneNumber,
  isSubmitting = false,
}: PhoneNumberFormProps) {
  const form = useForm<z.infer<typeof phoneNumberFormSchema>>({
    resolver: zodResolver(phoneNumberFormSchema),
    defaultValues: {
      phoneNumber: initialPhoneNumber || "",
    },
  });

  // Update defaultValues when initialPhoneNumber changes (e.g., after fetching)
  React.useEffect(() => {
    form.reset({ phoneNumber: initialPhoneNumber || "" });
  }, [initialPhoneNumber, form]);
  
  async function handleSubmit(values: z.infer<typeof phoneNumberFormSchema>) {
    // The value is already validated for E.164 format by Zod.
    // Firestore function `setUserPhoneNumberInFirestore` also does a final sanitization.
    await onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp Phone Number</FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="+12223334444" 
                    {...field} 
                    className="pl-10"
                  />
                </div>
              </FormControl>
              <FormDescription>
                Enter your phone number in E.164 format (includes country code, e.g., +1 for USA, +44 for UK). 
                This will be used for WhatsApp reminders.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground sm:w-auto">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Phone Number
        </Button>
      </form>
    </Form>
  );
}
