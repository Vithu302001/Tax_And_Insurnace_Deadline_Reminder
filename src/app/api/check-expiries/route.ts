
import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth, admin } from '@/lib/firebase/admin/config';
import { getAdminUserProfileById } from '@/lib/firebase/admin/users';
import { adminGetAllVehicles, adminUpdateVehicleNotificationTimestamp } from '@/lib/firebase/admin/firestore_admin';
import { sendVehicleSummaryEmail } from '@/lib/services/emailService';
import { generateSimpleHtmlReport } from '@/lib/reportUtils';
import type { Vehicle, SimplifiedVehicleForReport } from '@/lib/types';
import { format, differenceInDays, parseISO, addDays, isBefore } from 'date-fns';
// Correct Timestamp import for Admin SDK usage will be admin.firestore.Timestamp

const DAYS_UNTIL_EXPIRY_NOTIFICATION = 7; 
const NOTIFICATION_RESEND_GRACE_PERIOD_DAYS = 10;

const getVehicleStatusForReport = (expiryDate: Date): string => {
    const daysLeft = differenceInDays(expiryDate, new Date());
    if (daysLeft < 0) return 'Expired';
    if (daysLeft <= DAYS_UNTIL_EXPIRY_NOTIFICATION) return 'Urgent';
    return 'Upcoming';
};


export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Unauthorized attempt to access /api/check-expiries');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminDb = getAdminDb();
  const adminAuth = getAdminAuth(); // Initialize admin auth as well

  if (!adminDb || !adminAuth) { // Check both db and auth
    console.error('CRITICAL: Firebase Admin SDK (Firestore or Auth) is not available for cron job.');
    return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 500 });
  }


  let vehiclesChecked = 0;
  let notificationsSent = 0;
  let errorsEncountered = 0;
  const details = [];
  console.log('Cron job /api/check-expiries started at:', new Date().toISOString());

  try {
    const allVehicles = await adminGetAllVehicles(adminDb); // Use admin function
    vehiclesChecked = allVehicles.length;
    details.push(`Found ${vehiclesChecked} vehicles to check.`);

    for (const vehicle of allVehicles) {
      const now = new Date();
      const tenDaysAgo = addDays(now, -NOTIFICATION_RESEND_GRACE_PERIOD_DAYS);

      // Ensure dates are actual Date objects
      const taxExpiryDateAsDate = vehicle.taxExpiryDate instanceof Date ? vehicle.taxExpiryDate : new Date(vehicle.taxExpiryDate);
      const insuranceExpiryDateAsDate = vehicle.insuranceExpiryDate instanceof Date ? vehicle.insuranceExpiryDate : new Date(vehicle.insuranceExpiryDate);
      const lastTaxNotificationAsDate = vehicle.lastTaxNotificationSent instanceof Date ? vehicle.lastTaxNotificationSent : vehicle.lastTaxNotificationSent ? new Date(vehicle.lastTaxNotificationSent) : null;
      const lastInsuranceNotificationAsDate = vehicle.lastInsuranceNotificationSent instanceof Date ? vehicle.lastInsuranceNotificationSent : vehicle.lastInsuranceNotificationSent ? new Date(vehicle.lastInsuranceNotificationSent) : null;


      const taxDaysLeft = differenceInDays(taxExpiryDateAsDate, now);
      
      if (taxDaysLeft <= DAYS_UNTIL_EXPIRY_NOTIFICATION) {
        if (!lastTaxNotificationAsDate || isBefore(lastTaxNotificationAsDate, tenDaysAgo)) {
          details.push(`Vehicle ${vehicle.id} (User: ${vehicle.userId}): Tax expires in ${taxDaysLeft} days. Last notification: ${lastTaxNotificationAsDate ? lastTaxNotificationAsDate.toISOString() : 'Never'}.`);
          const userProfile = await getAdminUserProfileById(vehicle.userId); 
          if (userProfile && userProfile.email) {
            const simplifiedReportVehicle: SimplifiedVehicleForReport = {
              model: vehicle.model,
              registrationNumber: vehicle.registrationNumber,
              taxExpiryDate: format(taxExpiryDateAsDate, "MMM dd, yyyy"),
              insuranceExpiryDate: format(insuranceExpiryDateAsDate, "MMM dd, yyyy"),
              overallStatus: getVehicleStatusForReport(taxExpiryDateAsDate),
            };
            const reportHtml = generateSimpleHtmlReport(
              userProfile.displayName || userProfile.email.split('@')[0],
              [simplifiedReportVehicle],
              `Urgent: Tax Expiry for ${vehicle.model}`
            );
            try {
              await sendVehicleSummaryEmail(
                { email: userProfile.email, name: userProfile.displayName || undefined },
                reportHtml,
                `Vehicle Tax Expiry Reminder: ${vehicle.model}`
              );
              // Use admin.firestore.Timestamp and admin.firestore.FieldValue
              await adminUpdateVehicleNotificationTimestamp(adminDb, vehicle.id, 'tax', admin.firestore.Timestamp.now(), admin.firestore.FieldValue.serverTimestamp);
              notificationsSent++;
              details.push(`Tax notification sent for vehicle ${vehicle.id} to user ${vehicle.userId} (${userProfile.email}).`);
            } catch (emailError) {
              errorsEncountered++;
              details.push(`Failed to send tax notification for vehicle ${vehicle.id}: ${(emailError as Error).message}`);
            }
          } else {
            details.push(`Tax expiring for vehicle ${vehicle.id} (user ${vehicle.userId}), but user email not found or notification sent recently.`);
            if(!userProfile) console.warn(`Could not find user profile for userId: ${vehicle.userId} (Admin SDK) to send tax expiry email.`);
             else if (!userProfile.email) console.warn(`User profile found for userId: ${vehicle.userId} (Admin SDK) but no email address available.`);
          }
        } else {
          details.push(`Vehicle ${vehicle.id}: Tax expiring soon, but notification already sent recently (${lastTaxNotificationAsDate?.toISOString()}).`);
        }
      }

      const insuranceDaysLeft = differenceInDays(insuranceExpiryDateAsDate, now);

      if (insuranceDaysLeft <= DAYS_UNTIL_EXPIRY_NOTIFICATION) {
         if (!lastInsuranceNotificationAsDate || isBefore(lastInsuranceNotificationAsDate, tenDaysAgo)) {
          details.push(`Vehicle ${vehicle.id} (User: ${vehicle.userId}): Insurance expires in ${insuranceDaysLeft} days. Last notification: ${lastInsuranceNotificationAsDate ? lastInsuranceNotificationAsDate.toISOString() : 'Never'}.`);
          const userProfile = await getAdminUserProfileById(vehicle.userId);
          if (userProfile && userProfile.email) {
             const simplifiedReportVehicle: SimplifiedVehicleForReport = {
              model: vehicle.model,
              registrationNumber: vehicle.registrationNumber,
              taxExpiryDate: format(taxExpiryDateAsDate, "MMM dd, yyyy"),
              insuranceExpiryDate: format(insuranceExpiryDateAsDate, "MMM dd, yyyy"),
              overallStatus: getVehicleStatusForReport(insuranceExpiryDateAsDate),
            };
            const reportHtml = generateSimpleHtmlReport(
              userProfile.displayName || userProfile.email.split('@')[0],
              [simplifiedReportVehicle],
              `Urgent: Insurance Expiry for ${vehicle.model}`
            );
            try {
              await sendVehicleSummaryEmail(
                { email: userProfile.email, name: userProfile.displayName || undefined },
                reportHtml,
                `Vehicle Insurance Expiry Reminder: ${vehicle.model}`
              );
              await adminUpdateVehicleNotificationTimestamp(adminDb, vehicle.id, 'insurance', admin.firestore.Timestamp.now(), admin.firestore.FieldValue.serverTimestamp);
              notificationsSent++;
              details.push(`Insurance notification sent for vehicle ${vehicle.id} to user ${vehicle.userId} (${userProfile.email}).`);
            } catch (emailError) {
              errorsEncountered++;
              details.push(`Failed to send insurance notification for vehicle ${vehicle.id}: ${(emailError as Error).message}`);
            }
          } else {
            details.push(`Insurance expiring for vehicle ${vehicle.id} (user ${vehicle.userId}), but user email not found or notification sent recently.`);
             if(!userProfile) console.warn(`Could not find user profile for userId: ${vehicle.userId} (Admin SDK) to send insurance expiry email.`);
             else if (!userProfile.email) console.warn(`User profile found for userId: ${vehicle.userId} (Admin SDK) but no email address available for insurance.`);
          }
        } else {
           details.push(`Vehicle ${vehicle.id}: Insurance expiring soon, but notification already sent recently (${lastInsuranceNotificationAsDate?.toISOString()}).`);
        }
      }
    }
    console.log('Cron job /api/check-expiries finished. Checked:', vehiclesChecked, 'Sent:', notificationsSent, 'Errors:', errorsEncountered);
    return NextResponse.json({
      message: 'Expiry check complete.',
      vehiclesChecked,
      notificationsSent,
      errorsEncountered,
      details,
    });

  } catch (error: any) {
    console.error('Error in /api/check-expiries:', error);
    errorsEncountered++;
    details.push(`CRITICAL ERROR during processing: ${error.message}`);
    return NextResponse.json({
        message: 'Expiry check failed with critical error.',
        vehiclesChecked,
        notificationsSent,
        errorsEncountered,
        details: error.message, // Ensure the error message is included in the response
        error: 'Failed to process expiry checks.'
    }, { status: 500 });
  }
}
