import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { AppleSignInButton, useAppleSignInAvailable } from "./AppleSignInButton";
import { Button } from "./Button";
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

  if (user) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>Signed in as</Text>
        <Text style={[typography.cardTitle, styles.email, { color: colors.text }]}>{user.email}</Text>
        <Button label="Sign out" variant="secondary" onPress={signOut} />
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
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  error: { marginBottom: 10 },
  notice: { marginBottom: 10 },
  loading: { marginVertical: 8 },
  toggle: { textAlign: "center", marginTop: 12, fontWeight: "600" },
});
