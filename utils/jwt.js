import jwt from "jsonwebtoken";

export function generateToken(user) {
  const token = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  return token;
}



export const generatePasswordResetToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      purpose: "password-reset",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "10m",
    }
  );
};



export const verifyPasswordResetToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired reset token");
  }
};