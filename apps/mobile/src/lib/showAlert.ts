import { Alert, Platform } from "react-native";

// react-native-web's Alert.alert is a no-op (`static alert() {}` in the
// installed package), so any informational alert silently shows nothing on
// web — the same class of bug that made Sandbox's confirmations and the
// simulator's "End run" appear dead. Destructive confirmations get the
// nicer in-app ConfirmDialog; these are rare one-way error fallbacks
// ("this link is broken"), where the browser's own dialog is a perfectly
// reasonable stand-in and far better than the user getting no feedback at
// all after a tap that visibly did nothing.
export function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
