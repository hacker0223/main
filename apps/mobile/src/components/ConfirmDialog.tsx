import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

// react-native-web's Alert.alert() is a complete no-op (confirmed by
// reading the installed library: `static alert() {}`) — it shows nothing
// and never calls its button callbacks, so any confirm-before-destructive-
// action flow built on Alert.alert silently does nothing at all on web.
// This uses RN's own Modal instead, which renders correctly on every
// platform including web.
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[typography.cardTitle, { color: colors.text }]}>{title}</Text>
          {message ? (
            <Text style={[typography.caption, styles.message, { color: colors.textMuted }]}>{message}</Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.button, { borderColor: colors.border }]}>
              <Text style={[typography.body, { color: colors.text, fontWeight: "600" }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.button, { backgroundColor: colors.negative, borderColor: colors.negative }]}>
              <Text style={[typography.body, { color: "#fff", fontWeight: "700" }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  card: { borderRadius: 18, padding: 20 },
  message: { marginTop: 8, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
});
