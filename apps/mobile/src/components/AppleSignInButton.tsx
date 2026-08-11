import { useEffect, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../theme/useTheme";

// Shared with AuthCard so the "or" divider between this and the
// email/password form only renders when this button will too.
export function useAppleSignInAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);
  return available;
}

// Apple requires using their own button component (fixed look, no custom
// styling) rather than a themed button matching the rest of the app — this
// is a review requirement, not a design choice.
export function AppleSignInButton() {
  const { scheme } = useTheme();
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const available = useAppleSignInAvailable();

  if (!available) return null;

  const handlePress = async () => {
    try {
      // Apple signs the nonce we send and returns it inside the identity
      // token; Supabase re-checks that signed value against the raw nonce
      // we pass it separately, so a token stolen/replayed from elsewhere
      // can't be reused to sign in as someone else.
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      });

      if (credential.identityToken) {
        await signInWithApple(credential.identityToken, rawNonce);
      }
    } catch (err) {
      // ERR_REQUEST_CANCELED just means the user backed out of the native
      // sheet — that's a normal outcome, not a failure to surface.
      if ((err as { code?: string }).code === "ERR_REQUEST_CANCELED") return;
      throw err;
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={
        scheme === "dark"
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={10}
      style={styles.button}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  button: { width: "100%", height: 44, marginBottom: 14 },
});
