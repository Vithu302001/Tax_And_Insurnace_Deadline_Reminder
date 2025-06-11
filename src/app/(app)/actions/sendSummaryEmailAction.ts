
'use server';
import { getUserVehicles } from '@/lib/firebase/firestore';
import { sendVehicleSummaryEmail } from '@/lib/services/emailService';
import type { Vehicle, SimplifiedVehicleForReport } from '@/lib/types';
import { format, differenceInDays, parseISO } from "date-fns";
import { generateSimpleHtmlReport } from '@/lib/reportUtils';

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


export async function sendSummaryEmailAction(userId: string, userEmail: string, userName?: string | null) {
  if (!userId || !userEmail) {
    return { success: false, message: 'User information is missing.' };
  }

  try {
    const vehicles = await getUserVehicles(userId);
    
    const reportUserName = userName || userEmail.split('@')[0];

    const simplifiedVehiclesForReport: SimplifiedVehicleForReport[] = vehicles.map(v => ({
      model: v.model,
      registrationNumber: v.registrationNumber,
      taxExpiryDate: format(new Date(v.taxExpiryDate), "MMM dd, yyyy"),
      insuranceExpiryDate: format(new Date(v.insuranceExpiryDate), "MMM dd, yyyy"),
      overallStatus: getVehicleStatus(v),
    }));

    if (vehicles.length === 0) {
       const htmlReport = generateSimpleHtmlReport(reportUserName, []);
       await sendVehicleSummaryEmail({ email: userEmail, name: reportUserName }, htmlReport, "Vehicle Deadline Summary");
      return { success: true, message: 'Summary email sent. You have no vehicles to report.' };
    }
    
    const htmlReport = generateSimpleHtmlReport(reportUserName, simplifiedVehiclesForReport);
    await sendVehicleSummaryEmail({ email: userEmail, name: reportUserName }, htmlReport, "Vehicle Deadline Summary");
    
    return { success: true, message: 'Summary email sent successfully!' };

  } catch (error: any) {
    console.error('Error in sendSummaryEmailAction:', error);
    return { success: false, message: error.message || 'Failed to send summary email.' };
  }
}
