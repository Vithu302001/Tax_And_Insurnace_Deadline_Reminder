
'use server';
import type { User } from "firebase/auth";
import { getUserVehicles } from '@/lib/firebase/firestore';
import { sendVehicleSummaryEmail } from '@/lib/services/emailService';
import type { Vehicle } from '@/lib/types';
import { format, differenceInDays, parseISO } from "date-fns";

interface SimplifiedVehicleForReport {
  model: string;
  registrationNumber: string;
  taxExpiryDate: string; // Formatted as 'MMM dd, yyyy'
  insuranceExpiryDate: string; // Formatted as 'MMM dd, yyyy'
  overallStatus: string; // e.g., Urgent, Upcoming, Expired, Safe
}

const getDaysUntil = (expiryDate: Date | string) => {
    const date = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
    return differenceInDays(date, new Date());
};

const getVehicleStatus = (vehicle: Vehicle): string => {
    const taxDays = getDaysUntil(vehicle.taxExpiryDate);
    const insuranceDays = getDaysUntil(vehicle.insuranceExpiryDate);
    const overallDaysLeft = Math.min(taxDays, insuranceDays);

    if (overallDaysLeft < 0) return 'Expired';
    if (overallDaysLeft <= 7) return 'Urgent';
    if (overallDaysLeft <= 30) return 'Upcoming';
    return 'Safe';
};

function generateSimpleHtmlReport(userName: string | undefined | null, vehicles: SimplifiedVehicleForReport[]): string {
  let htmlReport = \`
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Vehicle Deadline Summary</h2>
      <p>Hi \${userName || 'there'},</p>
      <p>Here is your vehicle summary:</p>
  \`;

  if (vehicles.length > 0) {
    htmlReport += \`
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
    \`;
    vehicles.forEach(v => {
      htmlReport += \`
        <tr>
          <td style="padding: 10px;">\${v.model}</td>
          <td style="padding: 10px;">\${v.registrationNumber}</td>
          <td style="padding: 10px;">\${v.taxExpiryDate}</td>
          <td style="padding: 10px;">\${v.insuranceExpiryDate}</td>
          <td style="padding: 10px;">\${v.overallStatus}</td>
        </tr>
      \`;
    });
    htmlReport += \`</tbody></table>\`;
  } else {
    htmlReport += \`<p style="margin-top: 20px;">You currently have no vehicles registered.</p>\`;
  }
  htmlReport += \`
    <br/>
    <p>Regards,<br/>The DeadlineMind Team</p>
    </div>
  \`;
  return htmlReport;
}


export async function sendSummaryEmailAction(userId: string, userEmail: string, userName?: string | null) {
  if (!userId || !userEmail) {
    return { success: false, message: 'User information is missing.' };
  }

  try {
    const vehicles = await getUserVehicles(userId);
    
    const reportUserName = userName || userEmail.split('@')[0];

    const simplifiedVehiclesForReport = vehicles.map(v => ({
      model: v.model,
      registrationNumber: v.registrationNumber,
      taxExpiryDate: format(new Date(v.taxExpiryDate), "MMM dd, yyyy"),
      insuranceExpiryDate: format(new Date(v.insuranceExpiryDate), "MMM dd, yyyy"),
      overallStatus: getVehicleStatus(v),
    }));

    const htmlReport = generateSimpleHtmlReport(reportUserName, simplifiedVehiclesForReport);

    await sendVehicleSummaryEmail({ email: userEmail, name: reportUserName }, htmlReport);
    
    if (vehicles.length === 0) {
      return { success: true, message: 'Summary email sent. You have no vehicles to report.' };
    }
    return { success: true, message: 'Summary email sent successfully!' };

  } catch (error: any) {
    console.error('Error in sendSummaryEmailAction:', error);
    return { success: false, message: error.message || 'Failed to send summary email.' };
  }
}
