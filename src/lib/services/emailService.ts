
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

  let missingConfigError = "";
  if (!resendApiKey && !emailFromAddress) {
    missingConfigError = "Both RESEND_API_KEY and EMAIL_FROM_ADDRESS are missing from environment variables.";
  } else if (!resendApiKey) {
    missingConfigError = "RESEND_API_KEY is not set in environment variables. Email service cannot be initialized.";
  } else if (!emailFromAddress) {
    missingConfigError = "EMAIL_FROM_ADDRESS is not set in environment variables. Email service cannot be initialized.";
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
    if (error instanceof Error && error.message.startsWith("RESEND_API_KEY") || error.message.startsWith("EMAIL_FROM_ADDRESS")) {
        throw error; // Re-throw our specific config errors
    }
    if (error instanceof Error) {
        throw new Error(`Failed to send summary email: ${error.message}`);
    }
    throw new Error('An unknown error occurred while sending the summary email.');
  }
}
