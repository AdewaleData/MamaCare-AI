import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails via SMTP"""
    
    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None
    ) -> dict:
        """
        Send email via SMTP (Gmail).
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Plain text email body
            html_body: Optional HTML email body
        
        Returns:
            dict with status and details
        """
        # Check if email is enabled and configured
        if not settings.EMAIL_ENABLED:
            logger.info("Email sending is disabled. Email not sent.")
            return {"status": "skipped", "reason": "Email disabled", "sent": False}
        
        if not all([
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            settings.SMTP_USER,
            settings.SMTP_PASSWORD
        ]):
            logger.warning("SMTP not configured. Email not sent.")
            return {"status": "skipped", "reason": "SMTP not configured", "sent": False}
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = settings.SMTP_USER
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add plain text part
            text_part = MIMEText(body, 'plain')
            msg.attach(text_part)
            
            # Add HTML part if provided
            if html_body:
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()  # Enable encryption
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Email sent to {to_email}")
            return {
                "status": "sent",
                "sent": True,
                "to": to_email
            }
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return {
                "status": "failed",
                "sent": False,
                "error": str(e)
            }
    
    @staticmethod
    def send_token_email(to_email: str, token: str, user_name: str) -> dict:
        """
        Send JWT token to user's email.
        
        Args:
            to_email: User's email address
            token: JWT access token
            user_name: User's full name
        """
        subject = "Your MamaCare AI Access Token"
        
        body = f"""
Hello {user_name},

You have successfully logged into MamaCare AI.

Your access token is:
{token}

This token will expire in 30 minutes.

Keep this token secure and do not share it with anyone.

Best regards,
MamaCare AI Team
        """
        
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
        .token-box {{ background-color: #fff; border: 2px solid #4F46E5; padding: 15px; margin: 20px 0; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
        .warning {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 15px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MamaCare AI</h1>
        </div>
        <div class="content">
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>You have successfully logged into MamaCare AI.</p>
            
            <p>Your access token is:</p>
            <div class="token-box">
                {token}
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> This token will expire in 30 minutes. Keep it secure and do not share it with anyone.
            </div>
            
            <p>Use this token in the Authorization header for API requests:</p>
            <div class="token-box">
                Authorization: Bearer {token}
            </div>
        </div>
        <div class="footer">
            <p>Best regards,<br>MamaCare AI Team</p>
            <p>This is an automated email. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
        """
        
        return EmailService.send_email(to_email, subject, body, html_body)

