export type InvestorType = "casual" | "active_trader" | "long_term";

export type InterestTag =
  | "tech"
  | "healthcare"
  | "dividends"
  | "growth"
  | "crypto_adjacent"
  | "etfs";

export type RiskTolerance = "conservative" | "moderate" | "aggressive";

export interface OnboardingAnswers {
  investorType: InvestorType;
  interests: InterestTag[];
  riskTolerance: RiskTolerance | null;
  disclaimerAcknowledged: boolean;
}
