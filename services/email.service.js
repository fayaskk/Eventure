import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",

  port: 587,

  secure: false,

  auth: {
    user: process.env.EMAIL_USER,

    pass: process.env.EMAIL_PASS
      ?.replace(/\s/g, ""),
  },

  tls: {
    rejectUnauthorized: false,
  },
});


transporter.verify()
  .then(() => {
    console.log(
      "Gmail transporter is ready"
    );
  })
  .catch((error) => {
    console.error(
      "Gmail transporter verification failed:",
      error.message
    );
  });


export const sendOTPEmail = async (
  email,
  otp
) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,

      to: email,

      subject:
        "Verify your Eventure account",

      html: `
        <h2>Welcome to Eventure</h2>

        <p>
          Your email verification OTP is:
        </p>

        <h1>${otp}</h1>

        <p>
          This OTP will expire in 5 minutes.
        </p>

        <p>
          Do not share this OTP with anyone.
        </p>
      `,
    });

    console.log(
      "Email sent successfully:",
      info.messageId
    );

    return info;

  } catch (error) {

    console.error(
      "Email sending error:",
      error
    );

    throw new Error(
      "Failed to send OTP email"
    );
  }
};