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

/**
 * One member of the household. Each person has their own age, pots,
 * contributions and state pension — and, crucially, their own income-tax
 * personal allowance and bands, which is why the engine simulates each
 * person separately rather than merging the pots into one taxpayer.
 */
export interface Person {
  name: string;
  currentAge: number;
  retirementAge: number;

  portfolio: Portfolio;
  contributions: AnnualContributions;

  eligibleForStatePension: boolean;
  statePensionAnnual: number; // gross per year
  statePensionAge: number; // default 68
}

export interface RetirementInputs {
  // One person (solo) or two (with a partner). Tax is computed per person.
  people: Person[];

  // --- Household-level fields (shared across everyone) ---

  // Mortgage (a single household liability)
  hasMortgage: boolean;
  mortgageRemaining: number;
  mortgagePayoffAge: number; // the primary person's age at which the balance is cleared
  mortgagePayoffSource: MortgagePayoffSource; // which pot type funds the lump sum
  mortgagePayoffPerson: number; // index into people whose pot funds it

  // Retirement spending for the whole household
  targetAnnualSpending: number; // net post-tax

  // Assumptions
  realReturnRate: number; // e.g. 0.04
  swr: number; // e.g. 0.04
  pensionAccessAge: number; // legal minimum, shared (default 57)
}

export interface DrawdownYear {
  age: number; // primary person's age (x-axis reference)
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
  isaBridgeOnly: boolean; // true if no pension is yet accessible to anyone
}

/** A dashed marker drawn on the drawdown chart, positioned by primary-person age. */
export interface ChartMarker {
  age: number; // on the primary person's age axis
  label: string;
  color: string;
}

export interface RetirementResults {
  canRetire: boolean;
  portfolioAtRetirement: Portfolio; // combined across the household
  portfolioValueAtRetirement: number;
  swrIncomeAtRetirement: number;
  shortfallAtRetirement: number;

  // The age the household begins drawing down (the later of the retirement ages),
  // expressed on the primary person's age axis.
  householdRetirementAge: number;

  // Bridge gap analysis (period before any pension is accessible)
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
    personName: string;
    amount: number; // outstanding balance cleared
    taxPaid: number; // tax/CGT triggered by funding the lump sum
    fullyPaid: boolean; // false if the pot could not cover the balance
  } | null;

  // Drawdown projection
  drawdownYears: DrawdownYear[];
  chartMarkers: ChartMarker[];
  portfolioExhaustedAge: number | null;
  ageCanRetire: number | null; // primary person's age, if reachable by working longer
}
