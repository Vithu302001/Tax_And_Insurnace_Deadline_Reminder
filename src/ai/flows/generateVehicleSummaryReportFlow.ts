'use server';
/**
 * @fileOverview Generates an HTML report for vehicle summaries.
 * - generateVehicleSummaryReport - Generates HTML report.
 * - GenerateVehicleSummaryReportInputSchema - Input type Zod schema.
 * - GenerateVehicleSummaryReportInput - Input type.
 * - GenerateVehicleSummaryReportOutputSchema - Output type Zod schema.
 * - GenerateVehicleSummaryReportOutput - Output type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimplifiedVehicleSchema = z.object({
  model: z.string(),
  registrationNumber: z.string(),
  taxExpiryDate: z.string().describe("Formatted as 'MMM dd, yyyy'"),
  insuranceExpiryDate: z.string().describe("Formatted as 'MMM dd, yyyy'"),
  overallStatus: z.string().describe("e.g., Urgent, Upcoming, Expired, Safe"),
});

export const GenerateVehicleSummaryReportInputSchema = z.object({
  userName: z.string().optional().describe("The name of the user, if available."),
  vehicles: z.array(SimplifiedVehicleSchema).describe("List of user's vehicles with their statuses."),
});
export type GenerateVehicleSummaryReportInput = z.infer<typeof GenerateVehicleSummaryReportInputSchema>;

export const GenerateVehicleSummaryReportOutputSchema = z.object({
  htmlReport: z.string().describe("The HTML content of the vehicle summary report, suitable for an email body. Should not include <html>, <head>, or <body> tags."),
});
export type GenerateVehicleSummaryReportOutput = z.infer<typeof GenerateVehicleSummaryReportOutputSchema>;

export async function generateVehicleSummaryReport(input: GenerateVehicleSummaryReportInput): Promise<GenerateVehicleSummaryReportOutput> {
  return generateReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateVehicleSummaryReportPrompt',
  input: {schema: GenerateVehicleSummaryReportInputSchema},
  output: {schema: GenerateVehicleSummaryReportOutputSchema},
  prompt: `
    You are an assistant that generates a concise and friendly HTML summary report for vehicle deadlines.
    The user's name is {{#if userName}}{{userName}}{{else}}there{{/if}}.
    The report should be well-formatted HTML, suitable for direct inclusion in an email body.
    Do NOT include \`<html>\`, \`<head>\`, or \`<body>\` tags. Only generate the content for the email body.
    
    Start with a friendly greeting.
    Include a title like "<h2>Vehicle Deadline Summary</h2>".
    List each vehicle clearly. You can use a simple HTML table (<table>) or styled list (<ul> or <ol> with some inline CSS for clarity if needed).
    For each vehicle, display: Model, Registration Number, Tax Expiry Date, Insurance Expiry Date, and Overall Status.
    Keep the styling minimal and clean, suitable for most email clients.
    End with a polite closing, like "Regards,<br/>The DeadlineMind Team".

    Example of how to list vehicles (adapt as needed for good HTML structure):
    {{#each vehicles}}
    <p>
      <strong>Model:</strong> {{model}}<br/>
      <strong>Registration:</strong> {{registrationNumber}}<br/>
      <strong>Tax Due:</strong> {{taxExpiryDate}}<br/>
      <strong>Insurance Due:</strong> {{insuranceExpiryDate}}<br/>
      <strong>Status:</strong> {{overallStatus}}
    </p>
    <hr/>
    {{/each}}
  `,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateVehicleSummaryReportInputSchema,
    outputSchema: GenerateVehicleSummaryReportOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    
    if (!output?.htmlReport || output.htmlReport.trim() === "") {
      // Fallback if LLM fails to generate structured output or returns empty
      let fallbackHtml = `<h2>Vehicle Deadline Summary</h2>`;
      fallbackHtml += `<p>Hi ${input.userName || 'there'},</p>`;
      fallbackHtml += `<p>Here is your vehicle summary:</p><ul>`;
      if (input.vehicles.length > 0) {
        input.vehicles.forEach(v => {
          fallbackHtml += `<li><b>${v.model} (${v.registrationNumber})</b>: Tax due ${v.taxExpiryDate}, Insurance due ${v.insuranceExpiryDate}. Status: ${v.overallStatus}</li>`;
        });
      } else {
        fallbackHtml += `<li>You currently have no vehicles registered.</li>`;
      }
      fallbackHtml += `</ul><p>Regards,<br/>The DeadlineMind Team</p>`;
      return { htmlReport: fallbackHtml };
    }
    return output;
  }
);
