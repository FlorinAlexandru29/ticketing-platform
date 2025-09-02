// lib/mailer.ts (SMTP version)
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

export async function sendVerificationEmail(opts: {
  to: string;
  code: string;
  link: string; // optional link verification
}) {
  const { to, code, link } = opts;

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system;">
    <h2>Verify your StageList account</h2>
    <p>Enter this code in the app to verify your email:</p>
    <p style="font-size:28px; letter-spacing:6px; font-weight:700;">${code}</p>
    <p style="color:#555">Code valid for 15 minutes or until a new code is sent.</p>
    <p style="font-size:12px; color:#777">Prefer a link? <a href="${link}">Click to verify</a> (optional)</p>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || `"StageList" <verify.stagelist@gmail.com>`,
    to,
    subject: "Verify your StageList email",
    html,
  });
}

export async function sendNewEventEmail(opts: {
  to: string;
  title: string;
  dateText: string;
  venueName: string;
  city?: string | null;
  link: string;
}) {
  const { to, title, dateText, venueName, city, link } = opts;
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system;">
    <h2>New event: ${title}</h2>
    <p><strong>When:</strong> ${dateText}</p>
    <p><strong>Where:</strong> ${venueName}${city ? ", " + city : ""}</p>
    <p><a href="${link}">View event</a></p>
  </div>`;
  await transporter.sendMail({
    from: process.env.MAIL_FROM || `"StageList" <notify@stagelist.local>`,
    to,
    subject: `New event: ${title}`,
    html,
  });
}
