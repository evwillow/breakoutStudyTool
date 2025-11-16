/**
 * Email service for sending transactional emails
 * Supports multiple providers: AWS SES (scalable), Resend, SendGrid
 * Configure via environment variables
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using AWS SES (Recommended for scalability - $0.10 per 1,000 emails)
 */
async function sendWithAWSSES(options: SendEmailOptions): Promise<void> {
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
  const region = process.env.AWS_SES_REGION || "us-east-1";
  const fromEmail = process.env.AWS_SES_FROM_EMAIL || process.env.EMAIL_FROM || "reset-password@breakouts.trade";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_SES_ACCESS_KEY_ID and AWS_SES_SECRET_ACCESS_KEY environment variables are required");
  }

  // AWS SES API endpoint
  const endpoint = `https://email.${region}.amazonaws.com/`;
  
  // Create AWS Signature Version 4 request
  const crypto = await import("crypto");
  const date = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "");
  const dateStamp = date.substr(0, 8);
  
  // For simplicity, we'll use a simpler approach with AWS SDK if available
  // Otherwise, use direct API call with proper signing
  try {
    // Try to use @aws-sdk/client-ses if available
    const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
    
    const sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Optimize for instant sending
      maxAttempts: 1, // No retries - fail fast if there's an issue
    });

    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: options.html,
            Charset: "UTF-8",
          },
          Text: {
            Data: options.text || options.html.replace(/<[^>]*>/g, ""),
            Charset: "UTF-8",
          },
        },
      },
    });

    const response = await sesClient.send(command);
    // Email sent instantly - AWS SES queues and delivers immediately
    if (process.env.NODE_ENV === 'development') {
      console.log("✅ Email sent via AWS SES:", response.MessageId);
    }
  } catch (error: any) {
    // If AWS SDK is not available, provide helpful error
    if (error instanceof Error && error.message.includes("Cannot find module")) {
      console.error("⚠️  AWS SDK not installed. Install it with: npm install @aws-sdk/client-ses");
      throw new Error("AWS SDK is required. Run: npm install @aws-sdk/client-ses");
    }
    
    // Log detailed error for debugging
    console.error("AWS SES Error Details:", {
      message: error?.message,
      code: error?.Code || error?.code,
      name: error?.name,
      statusCode: error?.$metadata?.httpStatusCode,
      requestId: error?.$metadata?.requestId,
    });
    
    // Provide specific error messages for common issues
    if (error?.Code === "MessageRejected" || error?.message?.includes("Email address not verified")) {
      throw new Error("Email address not verified in AWS SES. Verify the recipient email in AWS SES console or request production access.");
    }
    
    if (error?.Code === "AccountSendingPausedException") {
      throw new Error("AWS SES account is in sandbox mode. Request production access in AWS SES console.");
    }
    
    const errorMessage = error?.message || error?.Code || "Unknown AWS SES error";
    throw new Error(`AWS SES error: ${errorMessage}`);
  }
}

/**
 * Send email using Resend API (100 emails/day free, then paid)
 */
async function sendWithResend(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    // In development, log the email instead of failing
    if (process.env.NODE_ENV === 'development') {
      console.log("=".repeat(80));
      console.log("📧 EMAIL (Development Mode - RESEND_API_KEY not set)");
      console.log("=".repeat(80));
      console.log("To:", options.to);
      console.log("Subject:", options.subject);
      console.log("\n--- HTML Content ---");
      console.log(options.html);
      console.log("\n--- Text Content ---");
      console.log(options.text || options.html.replace(/<[^>]*>/g, ""));
      console.log("=".repeat(80));
      console.log("\n⚠️  To send real emails, set RESEND_API_KEY in your .env file");
      console.log("📖 Setup instructions: https://resend.com/docs/getting-started\n");
      return; // Don't throw error in development
    }
    
    throw new Error("RESEND_API_KEY environment variable is not set. Please configure Resend API key.");
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "reset-password@breakouts.trade";
  
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      const errorMessage = errorData.message || errorData.error?.message || response.statusText;
      console.error("Resend API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`Resend API error: ${errorMessage} (Status: ${response.status})`);
    }

    const result = await response.json();
    // Email sent instantly via Resend
    if (process.env.NODE_ENV === 'development') {
      console.log("✅ Email sent via Resend:", result.id || "Email queued");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("RESEND_API_KEY")) {
      throw error;
    }
    console.error("Failed to send email via Resend:", error);
    throw new Error(`Email sending failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          You requested to reset your password for your Breakout Study Tool account.
        </p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
          Click the button below to reset your password. This link will expire in 1 hour.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          If you didn't request this password reset, you can safely ignore this email.
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #0d9488; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
          © 2025 Breakout Study Tool. All rights reserved.
        </p>
      </body>
    </html>
  `;

  const text = `
Reset Your Password

You requested to reset your password for your Breakout Study Tool account.

Click the link below to reset your password. This link will expire in 1 hour.

${resetUrl}

If you didn't request this password reset, you can safely ignore this email.

© 2025 Breakout Study Tool. All rights reserved.
  `;

  // Determine which email provider to use based on environment variables
  const emailProvider = process.env.EMAIL_PROVIDER?.toLowerCase() || "auto";
  
  // Auto-detect provider based on available credentials
  const hasAWSCredentials = process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY;
  const hasResendKey = process.env.RESEND_API_KEY;
  const hasSendGridKey = process.env.SENDGRID_API_KEY;

  try {
    // Priority: AWS SES > Resend > SendGrid
    if (emailProvider === "aws" || (emailProvider === "auto" && hasAWSCredentials)) {
      await sendWithAWSSES({
        to: email,
        subject: "Reset Your Password - Breakout Study Tool",
        html,
        text,
      });
    } else if (emailProvider === "resend" || (emailProvider === "auto" && hasResendKey)) {
      await sendWithResend({
        to: email,
        subject: "Reset Your Password - Breakout Study Tool",
        html,
        text,
      });
    } else if (emailProvider === "sendgrid" || (emailProvider === "auto" && hasSendGridKey)) {
      await sendWithSendGrid({
        to: email,
        subject: "Reset Your Password - Breakout Study Tool",
        html,
        text,
      });
    } else {
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        console.log("=".repeat(80));
        console.log("📧 EMAIL (Development Mode - No email provider configured)");
        console.log("=".repeat(80));
        console.log("To:", email);
        console.log("Subject: Reset Your Password - Breakout Study Tool");
        console.log("\n--- Reset URL ---");
        console.log(resetUrl);
        console.log("=".repeat(80));
        console.log("\n💡 To send real emails, configure one of:");
        console.log("   - AWS SES (scalable): Set AWS_SES_ACCESS_KEY_ID and AWS_SES_SECRET_ACCESS_KEY");
        console.log("   - Resend: Set RESEND_API_KEY");
        console.log("   - SendGrid: Set SENDGRID_API_KEY");
        console.log("📖 See EMAIL_SETUP.md for detailed instructions\n");
        return;
      }
      
      throw new Error(
        "No email provider configured. Set EMAIL_PROVIDER and required credentials. " +
        "See EMAIL_SETUP.md for setup instructions."
      );
    }
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}

/**
 * Send email using SendGrid API
 */
async function sendWithSendGrid(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM || "reset-password@breakouts.trade";
  
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY environment variable is not set");
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: options.to }],
        }],
        from: { email: fromEmail },
        subject: options.subject,
        content: [
          {
            type: "text/plain",
            value: options.text || options.html.replace(/<[^>]*>/g, ""),
          },
          {
            type: "text/html",
            value: options.html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      const errorMessage = errorData.errors?.[0]?.message || errorData.message || response.statusText;
      console.error("SendGrid API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`SendGrid API error: ${errorMessage} (Status: ${response.status})`);
    }

    // Email sent instantly via SendGrid
    if (process.env.NODE_ENV === 'development') {
      console.log("✅ Email sent via SendGrid");
    }
  } catch (error) {
    console.error("Failed to send email via SendGrid:", error);
    throw new Error(`Email sending failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

