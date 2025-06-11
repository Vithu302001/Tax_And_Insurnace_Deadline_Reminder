
import type { SimplifiedVehicleForReport } from '@/lib/types';

export function generateSimpleHtmlReport(userName: string | undefined | null, vehicles: SimplifiedVehicleForReport[], subjectLine?: string): string {
  const defaultSubject = "Vehicle Deadline Summary";
  let htmlReport = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>${subjectLine || defaultSubject}</h2>
      <p>Hi ${userName || 'there'},</p>
      <p>Here is your vehicle summary:</p>
  `;

  if (vehicles.length > 0) {
    htmlReport += `
      <table border="1" style="border-collapse: collapse; width: 100%; margin-top: 20px; font-size: 14px;">
        <thead style="background-color: #f2f2f2;">
          <tr>
            <th style="padding: 10px; text-align: left;">Model</th>
            <th style="padding: 10px; text-align: left;">Registration</th>
            <th style="padding: 10px; text-align: left;">Tax Due</th>
            <th style="padding: 10px; text-align: left;">Insurance Due</th>
            <th style="padding: 10px; text-align: left;">Status</th>
          </tr>
        </thead>
        <tbody>
    `;
    vehicles.forEach(v => {
      htmlReport += `
        <tr>
          <td style="padding: 10px;">${v.model}</td>
          <td style="padding: 10px;">${v.registrationNumber}</td>
          <td style="padding: 10px;">${v.taxExpiryDate}</td>
          <td style="padding: 10px;">${v.insuranceExpiryDate}</td>
          <td style="padding: 10px;">${v.overallStatus}</td>
        </tr>
      `;
    });
    htmlReport += `</tbody></table>`;
  } else {
    htmlReport += `<p style="margin-top: 20px;">You currently have no vehicles with relevant updates.</p>`;
  }
  htmlReport += `
    <br/>
    <p>Regards,<br/>The DeadlineMind Team</p>
    </div>
  `;
  return htmlReport;
}
