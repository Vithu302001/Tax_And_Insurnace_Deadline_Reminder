
// src/app/api/check-expiries/route.ts
import { NextResponse } from 'next/server';
import { getAllVehicles, updateVehicleNotificationTimestamp, getUserProfileById } from '@/lib/firebase/firestore';
import { sendVehicleSummaryEmail } from '@/lib/services/emailService';
import { generateSimpleHtmlReport } from '@/lib/reportUtils';
import type { Vehicle, SimplifiedVehicleForReport } from '@/lib/types';
import { format, differenceInDays, parseISO, addDays, isBefore, Timestamp } from 'date-fns';

const DAYS_UNTIL_EXPIRY_NOTIFICATION = 7; // Notify 7 days in advance
const NOTIFICATION_RESEND_GRACE_PERIOD_DAYS = 10; // Don't resend notification for the same expiry for at least 10 days

// Helper to get vehicle status for simplified report
const getVehicleStatusForReport = (expiryDate: Date): string => {
    const daysLeft = differenceInDays(expiryDate, new Date());
    if (daysLeft < 0) return 'Expired';
    if (daysLeft <= DAYS_UNTIL_EXPIRY_NOTIFICATION) return 'Urgent';
    return 'Upcoming';
};


export async function GET(request: Request) {
  // TODO: Secure this endpoint! Add a secret key check, IP whitelist, or other auth mechanism.
  // const authHeader = request.headers.get('Authorization');
  // if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  let vehiclesChecked = 0;
  let notificationsSent = 0;
  let errorsEncountered = 0;
  const details = [];

  try {
    const allVehicles = await getAllVehicles();
    vehiclesChecked = allVehicles.length;

    for (const vehicle of allVehicles) {
      const now = new Date();
      const tenDaysAgo = addDays(now, -NOTIFICATION_RESEND_GRACE_PERIOD_DAYS);

      // Check Tax Expiry
      const taxDaysLeft = differenceInDays(vehicle.taxExpiryDate, now);
      if (taxDaysLeft <= DAYS_UNTIL_EXPIRY_NOTIFICATION) {
        if (!vehicle.lastTaxNotificationSent || isBefore(vehicle.lastTaxNotificationSent, tenDaysAgo)) {
          const userProfile = await getUserProfileById(vehicle.userId);
          if (userProfile && userProfile.email) {
            const simplifiedReportVehicle: SimplifiedVehicleForReport = {
              model: vehicle.model,
              registrationNumber: vehicle.registrationNumber,
              taxExpiryDate: format(vehicle.taxExpiryDate, "MMM dd, yyyy"),
              insuranceExpiryDate: format(vehicle.insuranceExpiryDate, "MMM dd, yyyy"), // Include for context
              overallStatus: getVehicleStatusForReport(vehicle.taxExpiryDate),
            };
            const reportHtml = generateSimpleHtmlReport(
              userProfile.displayName || userProfile.email.split('@')[0],
              [simplifiedReportVehicle],
              \`Urgent: Tax Expiry for \${vehicle.model}\`
            );
            try {
              await sendVehicleSummaryEmail(
                { email: userProfile.email, name: userProfile.displayName || undefined },
                reportHtml,
                \`Vehicle Tax Expiry Reminder: \${vehicle.model}\`
              );
              await updateVehicleNotificationTimestamp(vehicle.id, 'tax', Timestamp.now());
              notificationsSent++;
              details.push(\`Tax notification sent for vehicle \${vehicle.id} to user \${vehicle.userId}\`);
            } catch (emailError) {
              errorsEncountered++;
              details.push(\`Failed to send tax notification for vehicle \${vehicle.id}: \${(emailError as Error).message}\`);
            }
          } else {
            details.push(\`Tax expiring for vehicle \${vehicle.id} (user \${vehicle.userId}), but user email not found or notification sent recently.\`);
          }
        }
      }

      // Check Insurance Expiry
      const insuranceDaysLeft = differenceInDays(vehicle.insuranceExpiryDate, now);
      if (insuranceDaysLeft <= DAYS_UNTIL_EXPIRY_NOTIFICATION) {
         if (!vehicle.lastInsuranceNotificationSent || isBefore(vehicle.lastInsuranceNotificationSent, tenDaysAgo)) {
          const userProfile = await getUserProfileById(vehicle.userId);
          if (userProfile && userProfile.email) {
             const simplifiedReportVehicle: SimplifiedVehicleForReport = {
              model: vehicle.model,
              registrationNumber: vehicle.registrationNumber,
              taxExpiryDate: format(vehicle.taxExpiryDate, "MMM dd, yyyy"), // Include for context
              insuranceExpiryDate: format(vehicle.insuranceExpiryDate, "MMM dd, yyyy"),
              overallStatus: getVehicleStatusForReport(vehicle.insuranceExpiryDate),
            };
            const reportHtml = generateSimpleHtmlReport(
              userProfile.displayName || userProfile.email.split('@')[0],
              [simplifiedReportVehicle],
              \`Urgent: Insurance Expiry for \${vehicle.model}\`
            );
            try {
              await sendVehicleSummaryEmail(
                { email: userProfile.email, name: userProfile.displayName || undefined },
                reportHtml,
                \`Vehicle Insurance Expiry Reminder: \${vehicle.model}\`
              );
              await updateVehicleNotificationTimestamp(vehicle.id, 'insurance', Timestamp.now());
              notificationsSent++;
              details.push(\`Insurance notification sent for vehicle \${vehicle.id} to user \${vehicle.userId}\`);
            } catch (emailError) {
              errorsEncountered++;
              details.push(\`Failed to send insurance notification for vehicle \${vehicle.id}: \${(emailError as Error).message}\`);
            }
          } else {
            details.push(\`Insurance expiring for vehicle \${vehicle.id} (user \${vehicle.userId}), but user email not found or notification sent recently.\`);
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Expiry check complete.',
      vehiclesChecked,
      notificationsSent,
      errorsEncountered,
      details,
    });

  } catch (error: any) {
    console.error('Error in /api/check-expiries:', error);
    return NextResponse.json({ error: 'Failed to process expiry checks.', details: error.message }, { status: 500 });
  }
}
