import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

async def send_alert_email(smtp_config: dict, to_emails: list, alert_data: dict):
    """
    Send alert email via SMTP
    """
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = f"[BLURA HUB] {alert_data['risk_level']} Risk Alert"
        message["From"] = smtp_config["username"]
        message["To"] = ", ".join(to_emails)
        
        # Email body
        html_body = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; }}
                    .header {{ background: #dc2626; color: white; padding: 20px; }}
                    .content {{ padding: 20px; }}
                    .risk-high {{ color: #dc2626; font-weight: bold; }}
                    .risk-medium {{ color: #f59e0b; font-weight: bold; }}
                    .info {{ margin: 10px 0; }}
                    .label {{ font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>BLURA HUB Security Alert</h1>
                </div>
                <div class="content">
                    <h2 class="risk-{alert_data['risk_level'].lower()}">{alert_data['risk_level']} RISK DETECTED</h2>
                    
                    <div class="info">
                        <span class="label">Platform:</span> {alert_data['platform'].upper()}
                    </div>
                    
                    <div class="info">
                        <span class="label">Author:</span> {alert_data['author']}
                    </div>
                    
                    <div class="info">
                        <span class="label">Content URL:</span> <a href="{alert_data['content_url']}">{alert_data['content_url']}</a>
                    </div>
                    
                    <div class="info">
                        <span class="label">Description:</span> {alert_data['description']}
                    </div>
                    
                    <div class="info">
                        <span class="label">Triggered Keywords:</span> {', '.join(alert_data.get('triggered_keywords', []))}
                    </div>
                    
                    <div class="info">
                        <span class="label">Alert Time:</span> {alert_data['created_at']}
                    </div>
                    
                    <p style="margin-top: 30px;">
                        <strong>Action Required:</strong> Please review this alert in the Blura Hub dashboard immediately.
                    </p>
                </div>
            </body>
        </html>
        """
        
        html_part = MIMEText(html_body, "html")
        message.attach(html_part)
        
        # Send email
        if smtp_config["host"] and smtp_config["username"] and smtp_config["password"]:
            await aiosmtplib.send(
                message,
                hostname=smtp_config["host"],
                port=smtp_config["port"],
                username=smtp_config["username"],
                password=smtp_config["password"],
                start_tls=True
            )
            logger.info(f"Alert email sent to {to_emails}")
            return True
        else:
            logger.warning("SMTP not configured, email not sent")
            return False
            
    except Exception as e:
        logger.error(f"Failed to send alert email: {e}")
        return False
