import httpx
from app.config import settings
from typing import List
import asyncio
import logging

logger = logging.getLogger(__name__)

class SMSService:
    """Service for sending SMS via Twilio."""
    
    @staticmethod
    async def send_sms_twilio(recipients: List[str], message: str) -> dict:
        """
        Send SMS via Twilio API.
        
        Args:
            recipients: List of phone numbers in E.164 format (e.g., +234812345678)
            message: SMS message text (max 160 characters per message)
        
        Returns:
            dict with status and details
        """
        if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN]):
            logger.warning("Twilio credentials not configured. SMS not sent.")
            return {"status": "skipped", "reason": "Twilio not configured", "sent": 0}
        
        url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
        auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        sent_count = 0
        failed = []
        
        for recipient in recipients:
            try:
                payload = {
                    "To": recipient,
                    "Body": message
                }
                # Use Messaging Service SID if available, otherwise use phone number
                if settings.TWILIO_MESSAGING_SERVICE_SID:
                    payload["MessagingServiceSid"] = settings.TWILIO_MESSAGING_SERVICE_SID
                else:
                    payload["From"] = settings.TWILIO_PHONE_NUMBER or settings.TWILIO_ACCOUNT_SID
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=payload, auth=auth, timeout=10.0)
                
                if response.status_code == 201:
                    sent_count += 1
                    logger.info(f"SMS sent to {recipient}")
                else:
                    failed.append({"recipient": recipient, "error": response.text})
                    logger.error(f"SMS failed for {recipient}: {response.status_code} - {response.text}")
            
            except Exception as e:
                failed.append({"recipient": recipient, "error": str(e)})
                logger.error(f"SMS error for {recipient}: {e}")
        
        return {
            "status": "completed" if sent_count > 0 else "failed",
            "sent": sent_count,
            "failed": len(failed),
            "errors": failed
        }
    
    @staticmethod
    async def send_alert_sms(recipients: List[str], patient_name: str, risk_level: str) -> dict:
        """
        Send emergency alert SMS to recipients.
        
        Args:
            recipients: List of phone numbers
            patient_name: Name of the patient
            risk_level: Risk level (HIGH, MEDIUM, LOW)
        """
        message = f"🚨 MamaCare ALERT: {patient_name} - {risk_level} RISK pregnancy alert. Please contact patient immediately."
        
        return await SMSService.send_sms_twilio(recipients, message)
    
    @staticmethod
    async def send_appointment_reminder_sms(recipient: str, patient_name: str, appointment_date: str) -> dict:
        """Send appointment reminder SMS."""
        message = f"Reminder: {patient_name}, you have a health appointment on {appointment_date}. Reply CONFIRM to confirm."
        
        return await SMSService.send_sms_twilio([recipient], message)

