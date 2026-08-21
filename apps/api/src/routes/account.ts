import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../services/supabaseAdmin";

export const accountRouter = Router();
accountRouter.use(requireAuth);

// Apple Guideline 5.1.1(v): any app that supports account creation must
// support account deletion in-app, not just deactivation or "email us."
// The mobile client only ever holds the anon/publishable key, which can't
// delete an auth.users row — that needs the service-role key, so this has
// to be a backend endpoint. simulator_runs/holdings/transactions all
// reference auth.users with ON DELETE CASCADE (see db/simulator_schema.sql),
// so removing the user here removes every trace of their data in one call.
accountRouter.delete("/", async (req, res) => {
  if (!supabaseAdmin) {
    res.status(503).json({ error: "Accounts aren't configured on this server yet." });
    return;
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.userId!);
  if (error) {
    console.error(`[account:delete] ${error.message}`);
    res.status(502).json({ error: "Couldn't delete your account. Try again shortly." });
    return;
  }
  res.status(204).end();
});
