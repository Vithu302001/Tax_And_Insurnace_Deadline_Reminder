'use server';
import { Resend } from 'resend';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export async function sendVehicleSummaryEmail(
  recipient: EmailRecipient,
  reportHtml: string
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS;

  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not set in environment variables.');
    throw new Error('Email service (Resend API key) is not configured.');
  }
  if (!emailFromAddress) {
    console.error('EMAIL_FROM_ADDRESS is not set in environment variables.');
    throw new Error('Email service (From address) is not configured.');
  }

  const resend = new Resend(resendApiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: `DeadlineMind <${emailFromAddress}>`,
      to: recipient.email,
      subject: 'Your Vehicle Deadline Summary',
      html: reportHtml,
    });

    if (error) {
      console.error('Error sending summary email via Resend:', error);
      throw new Error(`Failed to send summary email: ${error.message}`);
    }

    console.log('Summary email sent successfully to', recipient.email, 'ID:', data?.id);
  } catch (error) {
    // Catch any other unexpected errors during the send process
    console.error('Unexpected error sending summary email:', error);
    if (error instanceof Error) {
        throw new Error(`Failed to send summary email: ${error.message}`);
    }
    throw new Error('An unknown error occurred while sending the summary email.');
  }
}
