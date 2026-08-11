import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../services/supabaseAdmin";

// Augment Express's Request rather than inventing a parallel type — every
// downstream handler after requireAuth can just read req.userId.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Verifies the bearer token against Supabase's own auth server rather than
// decoding the JWT locally — one extra round trip per request, but it means
// this backend never has to manage JWKS rotation or signing-algorithm
// changes itself, and a revoked/expired session is rejected immediately
// rather than trusted until a locally-cached key expires.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!supabaseAdmin) {
    res.status(503).json({ error: "Accounts aren't configured on this server yet." });
    return;
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Your session has expired — sign in again." });
    return;
  }

  req.userId = data.user.id;
  next();
}
