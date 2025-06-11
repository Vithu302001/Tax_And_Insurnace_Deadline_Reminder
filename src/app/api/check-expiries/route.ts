
import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth, admin } from '@/lib/firebase/admin/config';
import { getAdminUserProfileById } from '@/lib/firebase/admin/users';
import { adminGetAllVehicles, adminUpdateVehicleNotificationTimestamp } from '@/lib/firebase/admin/firestore_admin';
import { sendVehicleSummaryEmail } from '@/lib/services/emailService';
import { sendWhatsAppReminder } from '@/lib/services/whatsappService'; // Import WhatsApp service
import { generateSimpleHtmlReport } from '@/lib/reportUtils';
import type { Vehicle, SimplifiedVehicleForReport, UserProfile } from '@/lib/types';
import { format, differenceInDays, parseISO, addDays, isBefore } from 'date-fns';

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
  const adminAuth = getAdminAuth();

  if (!adminDb) {
    console.error('CRITICAL: Firebase Admin SDK (Firestore) is not available for cron job.');
    return NextResponse.json({ error: 'Admin SDK (Firestore) not configured' }, { status: 500 });
  }
   if (!adminAuth) {
    console.error('CRITICAL: Firebase Admin SDK (Auth) is not available for cron job. Cannot fetch user profiles.');
    // Allow to continue for email if user profile somehow available, but log critical error
  }

  let vehiclesChecked = 0;
  let emailNotificationsSent = 0;
  let whatsappNotificationsSent = 0;
  let errorsEncountered = 0;
  const details = [];
  console.log('Cron job /api/check-expiries started at:', new Date().toISOString());

  try {
    const allVehicles = await adminGetAllVehicles(adminDb);
    vehiclesChecked = allVehicles.length;
    details.push(`Found ${vehiclesChecked} vehicles to check.`);

    for (const vehicle of allVehicles) {
      const now = new Date();
      const tenDaysAgo = addDays(now, -NOTIFICATION_RESEND_GRACE_PERIOD_DAYS);

      const taxExpiryDateAsDate = vehicle.taxExpiryDate instanceof Date ? vehicle.taxExpiryDate : new Date(vehicle.taxExpiryDate);
      const insuranceExpiryDateAsDate = vehicle.insuranceExpiryDate instanceof Date ? vehicle.insuranceExpiryDate : new Date(vehicle.insuranceExpiryDate);
      const lastTaxNotificationAsDate = vehicle.lastTaxNotificationSent instanceof Date ? vehicle.lastTaxNotificationSent : vehicle.lastTaxNotificationSent ? new Date(vehicle.lastTaxNotificationSent) : null;
      const lastInsuranceNotificationAsDate = vehicle.lastInsuranceNotificationSent instanceof Date ? vehicle.lastInsuranceNotificationSent : vehicle.lastInsuranceNotificationSent ? new Date(vehicle.lastInsuranceNotificationSent) : null;

      let userProfile: UserProfile | null = null;
      if (adminAuth) {
        userProfile = await getAdminUserProfileById(vehicle.userId);
      } else {
        details.push(`Admin Auth not initialized. Cannot fetch user profile for ${vehicle.userId}. Skipping WhatsApp, email might fail if profile not cached.`);
      }

      // Check Tax Expiry
      const taxDaysLeft = differenceInDays(taxExpiryDateAsDate, now);
      if (taxDaysLeft <= DAYS_UNTIL_EXPIRY_NOTIFICATION && taxDaysLeft >= 0) { // Only for upcoming, not already expired for new notifications
        if (!lastTaxNotificationAsDate || isBefore(lastTaxNotificationAsDate, tenDaysAgo)) {
          details.push(`Vehicle ${vehicle.id} (User: ${vehicle.userId}): Tax expires in ${taxDaysLeft} days. Last notification: ${lastTaxNotificationAsDate ? lastTaxNotificationAsDate.toISOString() : 'Never'}.`);
          if (userProfile) {
            const formattedTaxExpiry = format(taxExpiryDateAsDate, "MMM dd, yyyy");
            // Send Email
            if (userProfile.email) {
              const simplifiedReportVehicle: SimplifiedVehicleForReport = {
                model: vehicle.model,
                registrationNumber: vehicle.registrationNumber,
                taxExpiryDate: formattedTaxExpiry,
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
                emailNotificationsSent++;
                details.push(`Tax email notification sent for vehicle ${vehicle.id} to user ${vehicle.userId} (${userProfile.email}).`);
                 await adminUpdateVehicleNotificationTimestamp(adminDb, vehicle.id, 'tax', admin.firestore.Timestamp.now(), admin.firestore.FieldValue.serverTimestamp);
              } catch (emailError) {
                errorsEncountered++;
                details.push(`Failed to send tax email notification for vehicle ${vehicle.id}: ${(emailError as Error).message}`);
              }
            } else {
               details.push(`Tax expiring for vehicle ${vehicle.id} (user ${vehicle.userId}), but user email not found.`);
            }

            // Send WhatsApp
            if (userProfile.phoneNumber && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_CONTENT_SID) {
              const whatsappResult = await sendWhatsAppReminder({
                userProfile,
                vehicleModel: vehicle.model,
                vehicleRegNumber: vehicle.registrationNumber,
                documentType: 'Tax',
                expiryDateFormatted: formattedTaxExpiry,
              });
              if (whatsappResult.success) {
                whatsappNotificationsSent++;
                details.push(`Tax WhatsApp notification sent for vehicle ${vehicle.id} to user ${vehicle.userId} (${userProfile.phoneNumber}). SID: ${whatsappResult.messageSid}`);
                // No need to update timestamp again if email already did, or consider separate timestamps. For now, one update is fine.
              } else {
                errorsEncountered++;
                details.push(`Failed to send tax WhatsApp notification for vehicle ${vehicle.id}: ${whatsappResult.message}`);
              }
            } else if (userProfile.phoneNumber) {
                 details.push(`User ${vehicle.userId} has phone, but Twilio not fully configured for Tax WhatsApp.`);
            }

          } else {
            details.push(`Tax expiring for vehicle ${vehicle.id} (user ${vehicle.userId}), but user profile not found.`);
          }
        } else {
          details.push(`Vehicle ${vehicle.id}: Tax expiring soon, but notification already sent recently (${lastTaxNotificationAsDate?.toISOString()}).`);
        }
      }

      // Check Insurance Expiry
      const insuranceDaysLeft = differenceInDays(insuranceExpiryDateAsDate, now);
      if (insuranceDaysLeft <= DAYS_UNTIL_EXPIRY_NOTIFICATION && insuranceDaysLeft >=0) { // Only for upcoming
         if (!lastInsuranceNotificationAsDate || isBefore(lastInsuranceNotificationAsDate, tenDaysAgo)) {
          details.push(`Vehicle ${vehicle.id} (User: ${vehicle.userId}): Insurance expires in ${insuranceDaysLeft} days. Last notification: ${lastInsuranceNotificationAsDate ? lastInsuranceNotificationAsDate.toISOString() : 'Never'}.`);
          if (userProfile) {
            const formattedInsuranceExpiry = format(insuranceExpiryDateAsDate, "MMM dd, yyyy");
            // Send Email
            if (userProfile.email) {
              const simplifiedReportVehicle: SimplifiedVehicleForReport = {
                model: vehicle.model,
                registrationNumber: vehicle.registrationNumber,
                taxExpiryDate: format(taxExpiryDateAsDate, "MMM dd, yyyy"),
                insuranceExpiryDate: formattedInsuranceExpiry,
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
                emailNotificationsSent++;
                details.push(`Insurance email notification sent for vehicle ${vehicle.id} to user ${vehicle.userId} (${userProfile.email}).`);
                await adminUpdateVehicleNotificationTimestamp(adminDb, vehicle.id, 'insurance', admin.firestore.Timestamp.now(), admin.firestore.FieldValue.serverTimestamp);
              } catch (emailError) {
                errorsEncountered++;
                details.push(`Failed to send insurance email notification for vehicle ${vehicle.id}: ${(emailError as Error).message}`);
              }
            } else {
                details.push(`Insurance expiring for vehicle ${vehicle.id} (user ${vehicle.userId}), but user email not found.`);
            }
            
            // Send WhatsApp
            if (userProfile.phoneNumber && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_CONTENT_SID) {
              const whatsappResult = await sendWhatsAppReminder({
                userProfile,
                vehicleModel: vehicle.model,
                vehicleRegNumber: vehicle.registrationNumber,
                documentType: 'Insurance',
                expiryDateFormatted: formattedInsuranceExpiry,
              });
              if (whatsappResult.success) {
                whatsappNotificationsSent++;
                details.push(`Insurance WhatsApp notification sent for vehicle ${vehicle.id} to user ${vehicle.userId} (${userProfile.phoneNumber}). SID: ${whatsappResult.messageSid}`);
              } else {
                errorsEncountered++;
                details.push(`Failed to send insurance WhatsApp notification for vehicle ${vehicle.id}: ${whatsappResult.message}`);
              }
            } else if (userProfile.phoneNumber) {
                 details.push(`User ${vehicle.userId} has phone, but Twilio not fully configured for Insurance WhatsApp.`);
            }

          } else {
            details.push(`Insurance expiring for vehicle ${vehicle.id} (user ${vehicle.userId}), but user profile not found or notification sent recently.`);
          }
        } else {
           details.push(`Vehicle ${vehicle.id}: Insurance expiring soon, but notification already sent recently (${lastInsuranceNotificationAsDate?.toISOString()}).`);
        }
      }
    }
    console.log('Cron job /api/check-expiries finished. Checked:', vehiclesChecked, 'Email Sent:', emailNotificationsSent, 'WhatsApp Sent:', whatsappNotificationsSent, 'Errors:', errorsEncountered);
    return NextResponse.json({
      message: 'Expiry check complete.',
      vehiclesChecked,
      emailNotificationsSent,
      whatsappNotificationsSent,
      errorsEncountered,
      details,
    });

  } catch (error: any) {
    console.error('Error in /api/check-expiries:', error);
    errorsEncountered++;
    const errorMessage = error.message || 'Unknown error processing expiries.';
    details.push(`CRITICAL ERROR during processing: ${errorMessage}`);
    return NextResponse.json({
        message: 'Expiry check failed with critical error.',
        vehiclesChecked,
        emailNotificationsSent,
        whatsappNotificationsSent,
        errorsEncountered,
        details: errorMessage,
        error: 'Failed to process expiry checks.'
    }, { status: 500 });
  }
}
