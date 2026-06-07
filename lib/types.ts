export interface Portfolio {
  cash: number;
  pension: number;
  isa: number;
  lisa: number;
  gia: number;
}

export interface AnnualContributions {
  cash: number;
  pension: number;
  isa: number;
  lisa: number;
  gia: number;
}

export type MortgagePayoffSource = "cash" | "isa" | "pension";

export interface RetirementInputs {
  currentAge: number;
  retirementAge: number;

  // Current portfolio
  portfolio: Portfolio;

  // Mortgage
  hasMortgage: boolean;
  mortgageRemaining: number;
  mortgagePayoffAge: number; // age at which the remaining balance is cleared
  mortgagePayoffSource: MortgagePayoffSource; // which pot funds the lump sum

  // Annual contributions until retirement
  contributions: AnnualContributions;

  // State pension
  eligibleForStatePension: boolean;
  statePensionAnnual: number; // gross per year
  statePensionAge: number; // default 68

  // Retirement spending
  targetAnnualSpending: number; // net post-tax

  // Assumptions
  realReturnRate: number; // e.g. 0.04
  swr: number; // e.g. 0.04

  // Pension access age (default 57)
  pensionAccessAge: number;
}

export interface DrawdownYear {
  age: number;
  year: number;
  portfolioValue: number;
  cash: number;
  pension: number;
  isa: number;
  lisa: number;
  gia: number;
  totalWithdrawn: number;
  totalTaxPaid: number;
  statePensionIncome: number;
  portfolioIncome: number;
  isaBridgeOnly: boolean; // true if pension not yet accessible
}

export interface RetirementResults {
  canRetire: boolean;
  portfolioAtRetirement: Portfolio;
  portfolioValueAtRetirement: number;
  swrIncomeAtRetirement: number;
  shortfallAtRetirement: number;

  // Bridge gap analysis
  needsBridge: boolean;
  bridgePortfolio: Portfolio;
  bridgeYears: number;
  canBridgeGap: boolean;

  // LISA penalty warning
  lisaPenaltyWarning: boolean;

  // Mortgage payoff (null when there is no mortgage)
  mortgagePayoff: {
    age: number;
    source: MortgagePayoffSource;
    amount: number; // outstanding balance cleared
    taxPaid: number; // tax/CGT triggered by funding the lump sum
    fullyPaid: boolean; // false if the pot could not cover the balance
  } | null;

  // Drawdown projection
  drawdownYears: DrawdownYear[];
  portfolioExhaustedAge: number | null;
  ageCanRetire: number | null;
}
