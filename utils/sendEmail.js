const { Resend } = require("resend");

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set in your environment variables.");
}
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * @desc    Send an HTML email using Resend (anti-spam friendly)
 * @param   {Object} options - Email options
 * @param   {string} options.to - Recipient's email
 * @param   {string} options.subject - Email subject
 * @param   {string} options.name - Recipient's name
 * @param   {string} options.link - Link for action (e.g. email confirmation)
 */
const sendEmail = async ({ to, subject, name, link }) => {
    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px; color: #333;">
      <div style="max-width: 600px; margin: auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #4CAF50;">Bienvenue sur ProConnect !</h2>
        <p>Bonjour ${name},</p>
        <p>Merci de vous être inscrit sur notre plateforme.</p>
        <p>Pour confirmer votre adresse email, cliquez sur le bouton ci-dessous :</p>
        <a href="${link}" style="display:inline-block;background-color:#4CAF50;color:white;padding:10px 20px;margin-top:20px;text-decoration:none;border-radius:5px;">
          Confirmer mon email
        </a>
        <p style="margin-top: 30px; font-size: 12px; color: #777;">
          Si vous n'avez pas créé de compte, ignorez cet email.
        </p>
      </div>
    </div>
  `;

    try {
        const response = await resend.emails.send({
            from: `ProConnect <${process.env.RESEND_FROM_EMAIL}>`,
            to,
            subject,
            html,
        });

        console.log("✅ Email sent via Resend:", response.id);
    } catch (error) {
        console.error("❌ Error sending email via Resend:", error);
        throw error;
    }
};

module.exports = sendEmail;
