
'use server';
import Twilio from 'twilio';
import type { UserProfile } from '@/lib/types';

interface SendWhatsAppReminderArgs {
  userProfile: UserProfile;
  vehicleModel: string;
  vehicleRegNumber: string;
  documentType: 'Tax' | 'Insurance';
  expiryDateFormatted: string; // e.g., "MMM dd, yyyy"
}

export async function sendWhatsAppReminder({
  userProfile,
  vehicleModel,
  vehicleRegNumber,
  documentType,
  expiryDateFormatted,
}: SendWhatsAppReminderArgs): Promise<{ success: boolean; message: string; messageSid?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_FROM_NUMBER;
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;

  if (!accountSid || !authToken || !fromWhatsAppNumber || !contentSid) {
    const missingVars = [
      !accountSid && "TWILIO_ACCOUNT_SID",
      !authToken && "TWILIO_AUTH_TOKEN",
      !fromWhatsAppNumber && "TWILIO_WHATSAPP_FROM_NUMBER",
      !contentSid && "TWILIO_WHATSAPP_CONTENT_SID",
    ].filter(Boolean).join(", ");
    const errorMessage = `Twilio configuration is incomplete. Missing: ${missingVars}. WhatsApp reminder not sent.`;
    console.error(errorMessage);
    return { success: false, message: errorMessage };
  }

  if (!userProfile.phoneNumber) {
    const message = `User ${userProfile.uid} does not have a phone number. WhatsApp reminder for ${documentType} not sent.`;
    console.log(message);
    return { success: false, message };
  }
  
  // Ensure phone number is in E.164 format for Twilio (e.g., +1234567890)
  // Basic check, might need more robust validation depending on input source
  const toWhatsAppNumber = userProfile.phoneNumber.startsWith('whatsapp:') 
    ? userProfile.phoneNumber 
    : `whatsapp:${userProfile.phoneNumber.startsWith('+') ? '' : '+'}${userProfile.phoneNumber.replace(/\D/g, '')}`;


  const client = Twilio(accountSid, authToken);

  const contentVariables = JSON.stringify({
    '1': `${userProfile.displayName || userProfile.email?.split('@')[0] || 'Customer'}`, // User's name or identifier
    '2': `${vehicleModel} (${vehicleRegNumber})`, // Vehicle details
    '3': `${documentType}`, // Document type (Tax/Insurance)
    '4': expiryDateFormatted, // Expiry date
  });

  try {
    const message = await client.messages.create({
      from: fromWhatsAppNumber,
      contentSid: contentSid,
      contentVariables: contentVariables,
      to: toWhatsAppNumber,
    });
    console.log(`WhatsApp reminder sent to ${toWhatsAppNumber} for user ${userProfile.uid}. Message SID: ${message.sid}`);
    return { success: true, message: `WhatsApp reminder sent successfully.`, messageSid: message.sid };
  } catch (error: any) {
    console.error(`Error sending WhatsApp message to ${toWhatsAppNumber} for user ${userProfile.uid}:`, error.message);
    return { success: false, message: `Failed to send WhatsApp reminder: ${error.message}` };
  }
}
