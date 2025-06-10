'use server';
import type { User } from "firebase/auth";
import { getUserVehicles } from '@/lib/firebase/firestore';
import { sendVehicleSummaryEmail } from '@/lib/services/emailService';
import { 
  generateVehicleSummaryReport, 
  type GenerateVehicleSummaryReportInput 
} from '@/ai/flows/generateVehicleSummaryReportFlow';
import type { Vehicle } from '@/lib/types';
import { format, differenceInDays, parseISO } from "date-fns";

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

    if (vehicles.length === 0) {
       const reportInputNoVehicles: GenerateVehicleSummaryReportInput = {
        userName: reportUserName,
        vehicles: [],
      };
      const { htmlReport: noVehicleHtmlReport } = await generateVehicleSummaryReport(reportInputNoVehicles);
      await sendVehicleSummaryEmail({ email: userEmail, name: reportUserName }, noVehicleHtmlReport);
      return { success: true, message: 'Summary email sent. You have no vehicles to report.' };
    }

    const simplifiedVehiclesForReport = vehicles.map(v => ({
      model: v.model,
      registrationNumber: v.registrationNumber,
      taxExpiryDate: format(new Date(v.taxExpiryDate), "MMM dd, yyyy"),
      insuranceExpiryDate: format(new Date(v.insuranceExpiryDate), "MMM dd, yyyy"),
      overallStatus: getVehicleStatus(v),
    }));

    const reportInput: GenerateVehicleSummaryReportInput = {
      userName: reportUserName,
      vehicles: simplifiedVehiclesForReport,
    };

    const { htmlReport } = await generateVehicleSummaryReport(reportInput);

    await sendVehicleSummaryEmail({ email: userEmail, name: reportUserName }, htmlReport);
    return { success: true, message: 'Summary email sent successfully!' };
  } catch (error: any) {
    console.error('Error in sendSummaryEmailAction:', error);
    return { success: false, message: error.message || 'Failed to send summary email.' };
  }
}
