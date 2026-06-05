// UK 2025/26 tax constants
export const TAX = {
  personalAllowance: 12_570,
  basicRateLimit: 50_270,
  higherRateLimit: 125_140,
  basicRate: 0.20,
  higherRate: 0.40,
  additionalRate: 0.45,
  personalAllowanceTaperStart: 100_000,

  cgtAnnualExempt: 3_000,
  cgtBasicRate: 0.18,
  cgtHigherRate: 0.24,

  lisaBonusRate: 0.25,
  lisaMaxContribution: 4_000,
  lisaWithdrawalPenaltyRate: 0.25, // 25% on full amount = lose bonus + 6.25% of own
  lisaAccessAge: 60,
  lisaMaxContributionAge: 50,

  pensionTaxFreeFraction: 0.25,
  pensionAccessAge: 57,

  fullStatePension: 11_502, // 2025/26 full new state pension
};

/**
 * Returns effective personal allowance (tapered for high earners).
 */
function effectivePersonalAllowance(grossIncome: number): number {
  if (grossIncome <= TAX.personalAllowanceTaperStart) return TAX.personalAllowance;
  const taper = Math.floor((grossIncome - TAX.personalAllowanceTaperStart) / 2);
  return Math.max(0, TAX.personalAllowance - taper);
}

/**
 * Calculates income tax on gross income.
 */
export function calculateIncomeTax(grossIncome: number): number {
  if (grossIncome <= 0) return 0;
  const pa = effectivePersonalAllowance(grossIncome);
  const taxable = Math.max(0, grossIncome - pa);
  if (taxable <= 0) return 0;

  let tax = 0;

  const basicBand = TAX.basicRateLimit - TAX.personalAllowance;
  const inBasic = Math.min(taxable, basicBand);
  tax += inBasic * TAX.basicRate;

  if (taxable > basicBand) {
    const inHigher = Math.min(taxable - basicBand, TAX.higherRateLimit - TAX.basicRateLimit);
    tax += inHigher * TAX.higherRate;
  }

  if (taxable > TAX.higherRateLimit - TAX.personalAllowance) {
    const inAdditional = taxable - (TAX.higherRateLimit - TAX.personalAllowance);
    tax += inAdditional * TAX.additionalRate;
  }

  return Math.max(0, tax);
}

/**
 * Returns net income after income tax.
 */
export function netIncome(grossIncome: number): number {
  return grossIncome - calculateIncomeTax(grossIncome);
}

/**
 * Calculates CGT on realised gains, given the taxpayer's income tax band.
 * @param gains - realised gains
 * @param taxableIncome - income from other sources (affects CGT rate band)
 */
export function calculateCGT(gains: number, taxableIncome: number): number {
  const taxableGains = Math.max(0, gains - TAX.cgtAnnualExempt);
  if (taxableGains <= 0) return 0;

  const basicBandRemaining = Math.max(0, TAX.basicRateLimit - taxableIncome);
  const inBasic = Math.min(taxableGains, basicBandRemaining);
  const inHigher = taxableGains - inBasic;

  return inBasic * TAX.cgtBasicRate + inHigher * TAX.cgtHigherRate;
}

/**
 * Given a target net amount, returns the gross pension UFPLS withdrawal needed.
 * Each UFPLS: 25% tax-free, 75% taxable income.
 * Also accounts for state pension income already taxed.
 *
 * @param targetNet - net cash needed from pension
 * @param existingTaxableIncome - taxable income already received (e.g. state pension)
 */
export function grossPensionWithdrawalNeeded(
  targetNet: number,
  existingTaxableIncome: number
): number {
  // Binary search for gross withdrawal
  // gross * 0.25 is tax-free, gross * 0.75 is taxable
  // net = gross - income_tax(existingTaxableIncome + gross * 0.75) + income_tax(existingTaxableIncome)
  // i.e. net = gross - marginal_tax(gross * 0.75)
  let lo = 0;
  let hi = targetNet * 5;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const taxOnExisting = calculateIncomeTax(existingTaxableIncome);
    const taxOnExistingPlusPension = calculateIncomeTax(
      existingTaxableIncome + mid * (1 - TAX.pensionTaxFreeFraction)
    );
    const additionalTax = taxOnExistingPlusPension - taxOnExisting;
    const netFromPension = mid - additionalTax;
    if (netFromPension < targetNet) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return hi;
}

/**
 * Net state pension after income tax (pension counts as taxable income).
 * In practice, state pension is paid gross and you pay tax via other means,
 * but here we just return the effective net amount.
 */
export function netStatePension(annualStatePension: number): number {
  return annualStatePension - calculateIncomeTax(annualStatePension);
}
