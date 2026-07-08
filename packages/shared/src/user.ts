import type { OnboardingAnswers } from "./investor";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  onboarding: OnboardingAnswers | null;
  createdAt: string;
}
