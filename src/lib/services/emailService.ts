
'use server';
import { Resend } from 'resend';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export async function sendVehicleSummaryEmail(
  recipient: EmailRecipient,
  reportHtml: string,
  subject: string = 'Your Vehicle Deadline Summary' // Added subject parameter
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS;

  let missingConfigError = "";
  if (!resendApiKey && !emailFromAddress) {
    missingConfigError = "CRITICAL: Both RESEND_API_KEY and EMAIL_FROM_ADDRESS are missing. Email service non-functional.";
  } else if (!resendApiKey) {
    missingConfigError = "CRITICAL: RESEND_API_KEY is not set. Email service non-functional.";
  } else if (!emailFromAddress) {
    missingConfigError = "CRITICAL: EMAIL_FROM_ADDRESS is not set. Email service non-functional.";
  }

  if (missingConfigError) {
    console.error(missingConfigError);
    throw new Error(missingConfigError);
  }

  const resend = new Resend(resendApiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: `DeadlineMind <${emailFromAddress}>`,
      to: recipient.email,
      subject: subject, // Use the subject parameter
      html: reportHtml,
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Email sent successfully to', recipient.email, 'ID:', data?.id);
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    if (error instanceof Error && (error.message.startsWith("CRITICAL:") || error.message.startsWith("RESEND_API_KEY") || error.message.startsWith("EMAIL_FROM_ADDRESS"))) {
        throw error;
    }
    if (error instanceof Error) {
        throw new Error(`Failed to send email: ${error.message}`);
    }
    throw new Error('An unknown error occurred while sending the email.');
  }
}
