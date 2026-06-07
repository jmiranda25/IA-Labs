import jwt from "jsonwebtoken";

export type AccessTokenPayload = {
  userId: string;
  email: string;
  role: string;
};

export type RefreshTokenPayload = {
  userId: string;
};

export function generateAccessToken(userId: string, email: string, role: string): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return jwt.sign({ userId, email, role }, secret, { expiresIn: "15m" });
}

export function generateRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not set");
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not set");
  return jwt.verify(token, secret) as RefreshTokenPayload;
}
