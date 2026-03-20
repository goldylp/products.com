const nodemailer = require('nodemailer');

const createEmailTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const getFrontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const getEmailLogoUrl = () => process.env.EMAIL_LOGO_URL || `${getFrontendUrl()}/logo.png`;

const renderEmailLayout = ({ preheader, title, subtitle, bodyHtml, buttonLabel, buttonUrl, footerNote }) => {
  const logoUrl = getEmailLogoUrl();

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, sans-serif; color:#1f2937;">
        <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader || ''}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb; padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 18px 50px rgba(15,23,42,0.08);">
                <tr>
                  <td style="padding:18px 32px; background:#ffffff; border-bottom:1px solid #e5e7eb; text-align:center; vertical-align:middle; line-height:0;">
                    <div style="display:inline-block; padding:6px 10px; background:#ffffff; border-radius:14px;">
                      <img src="${logoUrl}" alt="HealthFuel Store" width="96" style="width:96px; max-width:96px; height:auto; display:block; margin:0 auto; border:0; outline:none; text-decoration:none;">
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <h1 style="margin:0 0 12px; font-size:28px; line-height:1.2; color:#111827;">${title}</h1>
                    <p style="margin:0 0 24px; font-size:16px; line-height:1.7; color:#4b5563;">${subtitle}</p>
                    ${bodyHtml}
                    ${buttonUrl && buttonLabel ? `
                      <div style="margin:28px 0 0;">
                        <a href="${buttonUrl}" style="display:inline-block; padding:14px 24px; border-radius:12px; background:#16a34a; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700;">
                          ${buttonLabel}
                        </a>
                      </div>
                    ` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px; background:#f9fafb; border-top:1px solid #e5e7eb; text-align:center; vertical-align:middle;">
                    <p style="margin:0; font-size:14px; font-weight:700; color:#111827;">HealthFuel Store</p>
                    <p style="margin:8px 0 0; font-size:13px; line-height:1.6; color:#6b7280;">
                      ${footerNote || 'Premium supplements for serious athletes and everyday health enthusiasts.'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const sendPasswordResetEmail = async (email, resetUrl, options = {}) => {
  const transporter = createEmailTransporter();
  const {
    subject = 'Password Reset Request',
    preheader = 'Reset your HealthFuel Store password.',
    title = 'Reset your password',
    subtitle = 'We received a request to reset your HealthFuel Store account password.',
    footerNote = 'Need help? Contact HealthFuel Store support for assistance with your account.'
  } = options;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject,
    html: renderEmailLayout({
      preheader,
      title,
      subtitle,
      bodyHtml: `
        <div style="padding:20px; border:1px solid #e5e7eb; border-radius:18px; background:#f9fafb;">
          <p style="margin:0 0 12px; font-size:15px; line-height:1.7; color:#374151;">
            Use the button below to choose a new password. For security, this link will expire in 1 hour or immediately after it is used.
          </p>
          <p style="margin:0; font-size:14px; line-height:1.7; color:#6b7280;">
            If this link has already been used or has expired, request a new reset email. If you did not request this reset, you can safely ignore this email.
          </p>
        </div>
        <p style="margin:24px 0 0; font-size:13px; line-height:1.7; color:#6b7280; word-break:break-word;">
          If the button does not work, copy and paste this link into your browser:<br>
          <span style="color:#16a34a;">${resetUrl}</span>
        </p>
      `,
      buttonLabel: 'Reset Password',
      buttonUrl: resetUrl,
      footerNote
    })
  });
};

const sendEmailVerificationEmail = async (email, verificationUrl, name = 'Customer') => {
  const transporter = createEmailTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your HealthFuel Store Account',
    html: renderEmailLayout({
      preheader: 'Verify your HealthFuel Store email address.',
      title: 'Verify your email',
      subtitle: `Welcome to HealthFuel Store, ${name}. Please confirm your email address to activate your account.`,
      bodyHtml: `
        <div style="padding:20px; border:1px solid #e5e7eb; border-radius:18px; background:#f9fafb;">
          <p style="margin:0 0 12px; font-size:15px; line-height:1.7; color:#374151;">
            Your account has been created successfully. To finish setup and sign in, please verify your email address using the button below.
          </p>
          <p style="margin:0; font-size:14px; line-height:1.7; color:#6b7280;">
            This verification link will expire in 24 hours. Please use it before it expires so you can activate your account and sign in.
          </p>
        </div>
        <p style="margin:24px 0 0; font-size:13px; line-height:1.7; color:#6b7280; word-break:break-word;">
          If the button does not work, copy and paste this link into your browser:<br>
          <span style="color:#16a34a;">${verificationUrl}</span>
        </p>
      `,
      buttonLabel: 'Verify Email',
      buttonUrl: verificationUrl,
      footerNote: 'Your HealthFuel Store account must be verified before you can sign in.'
    })
  });
};

const sendOrderConfirmationEmail = async (order) => {
  const transporter = createEmailTransporter();
  const orderUrl = `${getFrontendUrl()}/track-order/${encodeURIComponent(order.orderNumber || `HF-${String(order._id).slice(-8).toUpperCase()}`)}`;
  const displayOrderNumber = order.orderNumber || `HF-${String(order._id).slice(-8).toUpperCase()}`;

  const itemsHtml = order.items.map((item) => `
    <tr>
      <td style="padding:14px 12px; border-bottom:1px solid #e5e7eb;">
        <img src="${item.image}" alt="${item.name}" style="width:56px; height:56px; object-fit:cover; border-radius:10px; display:block;">
      </td>
      <td style="padding:14px 12px; border-bottom:1px solid #e5e7eb; color:#111827; font-weight:600;">${item.name}</td>
      <td style="padding:14px 12px; border-bottom:1px solid #e5e7eb; color:#4b5563;">${item.quantity}</td>
      <td style="padding:14px 12px; border-bottom:1px solid #e5e7eb; color:#111827; font-weight:700;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const subtotal = (order.total - (order.shippingCost || 0)).toFixed(2);
  const shipping = (order.shippingCost || 0).toFixed(2);
  const shippingAddressLines = [
    order.shippingAddress?.fullName,
    order.shippingAddress?.addressLine1,
    order.shippingAddress?.addressLine2,
    [order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.zipCode].filter(Boolean).join(', '),
    order.shippingAddress?.country
  ].filter(Boolean).join('<br>');

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: order.customerEmail,
    subject: `Order Confirmed - ${displayOrderNumber}`,
    html: renderEmailLayout({
      preheader: `Your HealthFuel Store order ${displayOrderNumber} has been confirmed.`,
      title: 'Order confirmed',
      subtitle: 'Thank you for your order. We have received it and will begin processing it shortly.',
      bodyHtml: `
        <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px;">
          <div style="flex:1 1 180px; padding:16px 18px; border-radius:16px; background:#f9fafb; border:1px solid #e5e7eb;">
            <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#6b7280; margin-bottom:6px;">Order Number</div>
            <div style="font-size:16px; font-weight:700; color:#111827;">${displayOrderNumber}</div>
          </div>
          <div style="flex:1 1 180px; padding:16px 18px; border-radius:16px; background:#f9fafb; border:1px solid #e5e7eb;">
            <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#6b7280; margin-bottom:6px;">Order Date</div>
            <div style="font-size:16px; font-weight:700; color:#111827;">${new Date(order.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px; border:1px solid #e5e7eb; border-radius:18px; overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:14px 12px; text-align:left; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.06em;">Product</th>
              <th style="padding:14px 12px; text-align:left; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.06em;">Name</th>
              <th style="padding:14px 12px; text-align:left; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.06em;">Qty</th>
              <th style="padding:14px 12px; text-align:left; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.06em;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="display:flex; flex-wrap:wrap; gap:18px;">
          <div style="flex:1 1 260px; padding:20px; border-radius:18px; background:#f9fafb; border:1px solid #e5e7eb;">
            <h3 style="margin:0 0 12px; font-size:18px; color:#111827;">Shipping Address</h3>
            <p style="margin:0; font-size:14px; line-height:1.8; color:#4b5563;">${shippingAddressLines}</p>
          </div>
          <div style="flex:1 1 220px; padding:20px; border-radius:18px; background:#111827; color:#ffffff;">
            <h3 style="margin:0 0 12px; font-size:18px;">Order Summary</h3>
            <p style="margin:0 0 8px; font-size:14px; color:#d1d5db;">Subtotal: <strong style="color:#ffffff;">$${subtotal}</strong></p>
            <p style="margin:0 0 8px; font-size:14px; color:#d1d5db;">Shipping: <strong style="color:#ffffff;">$${shipping}</strong></p>
            <p style="margin:14px 0 0; padding-top:14px; border-top:1px solid rgba(255,255,255,0.16); font-size:18px; font-weight:700;">Total: $${order.total.toFixed(2)}</p>
          </div>
        </div>
      `,
      buttonLabel: 'Track Order',
      buttonUrl: orderUrl,
      footerNote: 'HealthFuel Store will keep you updated as your order moves through processing and shipment.'
    })
  });
};

const sendContactNotificationEmail = async ({ name, email, subject, message }) => {
  const transporter = createEmailTransporter();
  const recipient = process.env.EMAIL_FROM;

  if (!recipient) {
    throw new Error('EMAIL_FROM is not configured');
  }

  await transporter.sendMail({
    from: recipient,
    to: recipient,
    replyTo: email,
    subject: `New Contact Message: ${subject}`,
    html: renderEmailLayout({
      preheader: `New contact inquiry from ${name}.`,
      title: 'New contact message',
      subtitle: 'A new message was submitted through the HealthFuel Store contact form.',
      bodyHtml: `
        <div style="padding:20px; border:1px solid #e5e7eb; border-radius:18px; background:#f9fafb; margin-bottom:18px;">
          <p style="margin:0 0 8px; font-size:14px; color:#6b7280;">From</p>
          <p style="margin:0; font-size:16px; line-height:1.7; color:#111827; font-weight:700;">${name}</p>
          <p style="margin:6px 0 0; font-size:14px; line-height:1.7; color:#16a34a;">${email}</p>
        </div>
        <div style="padding:20px; border:1px solid #e5e7eb; border-radius:18px; background:#ffffff; margin-bottom:18px;">
          <p style="margin:0 0 8px; font-size:14px; color:#6b7280;">Subject</p>
          <p style="margin:0; font-size:16px; line-height:1.7; color:#111827; font-weight:700;">${subject}</p>
        </div>
        <div style="padding:20px; border:1px solid #e5e7eb; border-radius:18px; background:#ffffff;">
          <p style="margin:0 0 8px; font-size:14px; color:#6b7280;">Message</p>
          <p style="margin:0; font-size:15px; line-height:1.8; color:#374151; white-space:pre-wrap;">${message}</p>
        </div>
      `,
      footerNote: 'This message was sent from the HealthFuel Store contact form.'
    })
  });
};

module.exports = {
  getFrontendUrl,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendOrderConfirmationEmail,
  sendContactNotificationEmail
};
