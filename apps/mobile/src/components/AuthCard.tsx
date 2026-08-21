import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { AppleSignInButton, useAppleSignInAvailable } from "./AppleSignInButton";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { deleteAccount } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

// The only place in the app that signs you in. Everything else — the
// watchlist, alerts, disclosures — stays local and works fully signed-out.
// An account is what the Time Machine simulator hangs its saved runs and
// Hall of Fame entries off, and what a future subscription would attach to.
export function AuthCard() {
  const { colors } = useTheme();
  const { user, loading, error, signIn, signUp, signOut, clearError } = useAuthStore();
  const appleAvailable = useAppleSignInAvailable();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [justSignedUp, setJustSignedUp] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      // The account no longer exists server-side, but the device still
      // holds a session token until it expires — clear it immediately
      // rather than leaving a signed-in UI pointed at a deleted account.
      await signOut();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete your account.");
      setDeleting(false);
    }
  };

  if (user) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>Signed in as</Text>
        <Text style={[typography.cardTitle, styles.email, { color: colors.text }]}>{user.email}</Text>
        <Button label="Sign out" variant="secondary" onPress={signOut} />

        {deleteError ? <Text style={[typography.caption, styles.error, { color: colors.negative }]}>{deleteError}</Text> : null}

        {deleting ? (
          <ActivityIndicator color={colors.negative} style={styles.loading} />
        ) : (
          <Text onPress={() => setConfirmDelete(true)} style={[typography.caption, styles.deleteLink, { color: colors.negative }]}>
            Delete account
          </Text>
        )}

        <ConfirmDialog
          visible={confirmDelete}
          title="Delete your account?"
          message="This permanently deletes your account, every Time Machine run you've saved, and your spot on the Hall of Fame. This can't be undone. Your local watchlist and alerts stay on this device and aren't affected."
          confirmLabel="Delete account"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDeleteAccount}
        />
      </View>
    );
  }

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !loading;

  const submit = async () => {
    clearError();
    setJustSignedUp(false);
    const ok = mode === "signIn" ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    if (ok && mode === "signUp") setJustSignedUp(true);
  };

  const toggleMode = () => {
    clearError();
    setJustSignedUp(false);
    setMode((m) => (m === "signIn" ? "signUp" : "signIn"));
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[typography.cardTitle, { color: colors.text }]}>
        {mode === "signIn" ? "Sign in" : "Create an account"}
      </Text>
      <Text style={[typography.micro, styles.subtitle, { color: colors.textMuted }]}>
        Optional — the rest of Summit works signed out. An account saves your Time Machine runs and your spot on
        the Hall of Fame.
      </Text>

      {appleAvailable ? (
        <>
          <AppleSignInButton />
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[typography.micro, { color: colors.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>
        </>
      ) : null}

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        style={[typography.body, styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password (6+ characters)"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        textContentType={mode === "signUp" ? "newPassword" : "password"}
        style={[typography.body, styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
      />

      {error ? <Text style={[typography.caption, styles.error, { color: colors.negative }]}>{error}</Text> : null}
      {justSignedUp ? (
        <Text style={[typography.caption, styles.notice, { color: colors.primary }]}>
          Check your email to confirm your account.
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : (
        <Button label={mode === "signIn" ? "Sign in" : "Create account"} onPress={submit} disabled={!canSubmit} />
      )}

      <Text
        onPress={toggleMode}
        style={[typography.caption, styles.toggle, { color: colors.primary }]}
      >
        {mode === "signIn" ? "New here? Create an account" : "Already have an account? Sign in"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  subtitle: { marginTop: 4, marginBottom: 14, lineHeight: 16 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  email: { marginTop: 2, marginBottom: 14 },
  deleteLink: { textAlign: "center", marginTop: 14, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  error: { marginBottom: 10 },
  notice: { marginBottom: 10 },
  loading: { marginVertical: 8 },
  toggle: { textAlign: "center", marginTop: 12, fontWeight: "600" },
});
