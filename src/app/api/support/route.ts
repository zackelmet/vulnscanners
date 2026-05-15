import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface SupportRequest {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SupportRequest = await req.json();
    const { name, email, category, subject, message } = body;

    // Validate required fields
    if (!name || !email || !category || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return NextResponse.json(
        {
          error:
            "Email service is not configured. Please contact administrator.",
        },
        { status: 500 },
      );
    }

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "VulnScanners Support <onboarding@resend.dev>", // Will need to update with verified domain
        to: ["zacharyelmetennani@gmail.com"],
        reply_to: email,
        subject: `[${category.toUpperCase()}] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0d1117; color: #e6edf5; padding: 20px; border-bottom: 3px solid #0366d6;">
              <h1 style="margin: 0; font-size: 24px;">VulnScanners Support Request</h1>
            </div>

            <div style="background: #fff; padding: 30px; color: #333;">
              <h2 style="color: #0366d6; margin-top: 0;">New Support Request</h2>

              <div style="background: #f6f8fa; padding: 15px; border-left: 4px solid #0366d6; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>From:</strong> ${name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Category:</strong> ${category}</p>
                <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
              </div>

              <h3 style="color: #0366d6;">Message:</h3>
              <div style="background: #f6f8fa; padding: 20px; border-radius: 5px; white-space: pre-wrap;">
                ${message}
              </div>

              <hr style="border: none; border-top: 1px solid #e1e4e8; margin: 30px 0;" />

              <p style="color: #666; font-size: 13px; margin: 10px 0;">
                This email was sent from the VulnScanners support form.
                Reply directly to this email to respond to ${name}.
              </p>
            </div>

            <div style="background: #0d1117; color: #9aa5b6; padding: 15px; text-align: center; font-size: 12px;">
              <p style="margin: 5px 0;">© ${new Date().getFullYear()} VulnScanners. All rights reserved.</p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      return NextResponse.json(
        { error: "Failed to send email. Please try again later." },
        { status: 500 },
      );
    }

    const result = await emailResponse.json();
    console.log("Support email sent successfully:", result.id);

    return NextResponse.json({
      success: true,
      message: "Support request submitted successfully",
    });
  } catch (error: any) {
    console.error("Error processing support request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
