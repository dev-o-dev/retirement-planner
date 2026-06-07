import { Portfolio, AnnualContributions, RetirementInputs, RetirementResults, DrawdownYear, MortgagePayoffSource } from "./types";
import { TAX, calculateIncomeTax, calculateCGT, grossPensionWithdrawalNeeded, netStatePension } from "./tax";

function growPortfolio(portfolio: Portfolio, rate: number): Portfolio {
  return {
    cash: portfolio.cash * (1 + rate),
    pension: portfolio.pension * (1 + rate),
    isa: portfolio.isa * (1 + rate),
    lisa: portfolio.lisa * (1 + rate),
    gia: portfolio.gia * (1 + rate),
  };
}

function totalPortfolio(portfolio: Portfolio): number {
  return portfolio.cash + portfolio.pension + portfolio.isa + portfolio.lisa + portfolio.gia;
}

/**
 * Accumulates the portfolio from currentAge to retirementAge,
 * applying contributions and growth each year.
 * Returns portfolio at start of retirement.
 */
function accumulatePortfolio(inputs: RetirementInputs): Portfolio {
  const { currentAge, retirementAge, portfolio, contributions, realReturnRate } = inputs;
  let p: Portfolio = { ...portfolio };

  for (let age = currentAge; age < retirementAge; age++) {
    // Grow first, then contribute (beginning-of-year contributions)
    p = growPortfolio(p, realReturnRate);

    p.cash += contributions.cash;
    p.pension += contributions.pension;
    p.isa += contributions.isa;

    // LISA: bonus applies on contributions up to £4,000/year, up to age 50
    const lisaContrib = age < TAX.lisaMaxContributionAge ? contributions.lisa : 0;
    if (lisaContrib > 0) {
      const cappedContrib = Math.min(lisaContrib, TAX.lisaMaxContribution);
      const bonus = cappedContrib * TAX.lisaBonusRate;
      p.lisa += cappedContrib + bonus;
    }

    p.gia += contributions.gia;
  }

  return p;
}

/**
 * Result of clearing the mortgage from the portfolio in a single year.
 * Mutates the passed-in portfolio.
 */
interface MortgagePayoffOutcome {
  taxPaid: number; // income tax (pension) or CGT (GIA) triggered by funding the lump sum
  paid: number; // how much of the balance was actually cleared
  giaCostBasis: number; // updated GIA cost basis after any GIA drain
  taxablePension: number; // taxable pension income generated this year (affects other bands)
}

/**
 * Clears `amount` off the mortgage from the portfolio, draining the user's
 * chosen source first and overflowing into other pots if it runs short.
 *
 * - cash / isa: tax-free, £1 of pot clears £1 of mortgage.
 * - gia: realises gains, so CGT is applied (more pot is needed per £ cleared).
 * - pension: drawn as UFPLS (25% tax-free, 75% taxable), consistent with the
 *   rest of the engine; only available once the pension is accessible.
 */
function payMortgageLumpSum(
  p: Portfolio,
  giaCostBasis: number,
  amount: number,
  source: MortgagePayoffSource,
  age: number,
  pensionAccessAge: number,
  otherTaxableIncome: number
): MortgagePayoffOutcome {
  let remaining = amount;
  let taxPaid = 0;
  let taxablePension = 0;

  const drainTaxFree = (pot: "cash" | "isa") => {
    if (remaining <= 0) return;
    const w = Math.min(remaining, p[pot]);
    p[pot] -= w;
    remaining -= w;
  };

  const drainGIA = () => {
    if (remaining <= 0 || p.gia <= 0) return;
    const gainsFraction = Math.max(0, p.gia - giaCostBasis) / p.gia;
    let lo = 0;
    let hi = Math.min(remaining * 3, p.gia);
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const cgt = calculateCGT(mid * gainsFraction, otherTaxableIncome);
      if (mid - cgt < remaining) lo = mid;
      else hi = mid;
    }
    const w = Math.min(hi, p.gia);
    const cgt = calculateCGT(w * gainsFraction, otherTaxableIncome);
    giaCostBasis = giaCostBasis * (1 - w / p.gia);
    p.gia -= w;
    taxPaid += cgt;
    remaining = Math.max(0, remaining - (w - cgt));
  };

  const drainPension = () => {
    if (remaining <= 0 || p.pension <= 0 || age < pensionAccessAge) return;
    const grossNeeded = grossPensionWithdrawalNeeded(remaining, otherTaxableIncome + taxablePension);
    const gross = Math.min(grossNeeded, p.pension);
    const taxable = gross * (1 - TAX.pensionTaxFreeFraction);
    const tax =
      calculateIncomeTax(otherTaxableIncome + taxablePension + taxable) -
      calculateIncomeTax(otherTaxableIncome + taxablePension);
    p.pension -= gross;
    taxPaid += tax;
    taxablePension += taxable;
    remaining = Math.max(0, remaining - (gross - tax));
  };

  // Chosen source first, then a sensible fallback order so the balance still clears.
  const order: Array<() => void> =
    source === "pension"
      ? [drainPension, () => drainTaxFree("cash"), () => drainTaxFree("isa"), drainGIA]
      : source === "isa"
      ? [() => drainTaxFree("isa"), () => drainTaxFree("cash"), drainGIA, drainPension]
      : [() => drainTaxFree("cash"), () => drainTaxFree("isa"), drainGIA, drainPension];

  for (const step of order) step();

  return { taxPaid, paid: amount - remaining, giaCostBasis, taxablePension };
}

/**
 * Simulates drawdown year by year in retirement.
 * Returns an array of yearly snapshots.
 *
 * GIA cost basis: starts at retirement GIA value (all existing gains already "baked in").
 * New growth in GIA is trackable as gains from retirement day forward.
 */
function simulateDrawdown(
  inputs: RetirementInputs,
  portfolioAtRetirement: Portfolio
): { years: DrawdownYear[]; payoff: RetirementResults["mortgagePayoff"] } {
  const { retirementAge, realReturnRate, targetAnnualSpending, pensionAccessAge, eligibleForStatePension, statePensionAnnual, statePensionAge } = inputs;

  let p: Portfolio = { ...portfolioAtRetirement };
  // Track GIA cost basis: value at retirement is basis (we don't know pre-retirement gains)
  let giaCostBasis = portfolioAtRetirement.gia;
  const years: DrawdownYear[] = [];

  // Mortgage is cleared in a single year. It can't be paid before retirement (the
  // pot doesn't exist yet) or past age 100, so clamp into the simulated window.
  const mortgageBalance = inputs.hasMortgage ? inputs.mortgageRemaining : 0;
  const mortgagePayoffAge = Math.min(100, Math.max(retirementAge, inputs.mortgagePayoffAge));
  let payoff: RetirementResults["mortgagePayoff"] =
    mortgageBalance > 0
      ? { age: mortgagePayoffAge, source: inputs.mortgagePayoffSource, amount: mortgageBalance, taxPaid: 0, fullyPaid: false }
      : null;

  // Run to age 100 or until portfolio is empty
  for (let age = retirementAge; age <= 100; age++) {
    if (totalPortfolio(p) <= 0 && age > retirementAge) break;

    const statePensionGross = eligibleForStatePension && age >= statePensionAge ? statePensionAnnual : 0;

    // Determine how much net income we need from portfolio
    // State pension is taxable income; we need to figure out how much net it provides
    const statePensionTax = calculateIncomeTax(statePensionGross);
    const statePensionNet = statePensionGross - statePensionTax;
    const neededFromPortfolio = Math.max(0, targetAnnualSpending - statePensionNet);

    let remainingNeeded = neededFromPortfolio;
    let totalTaxPaid = statePensionTax;
    let totalWithdrawn = 0;

    // --- 0. Mortgage payoff (one-off lump sum in the chosen year) ---
    // Taxable pension drawn to fund it pushes up the income-tax band for the rest
    // of this year's withdrawals, so we carry it forward.
    let mortgageTaxablePension = 0;
    if (payoff && age === payoff.age) {
      const outcome = payMortgageLumpSum(
        p,
        giaCostBasis,
        payoff.amount,
        payoff.source,
        age,
        pensionAccessAge,
        statePensionGross
      );
      giaCostBasis = outcome.giaCostBasis;
      mortgageTaxablePension = outcome.taxablePension;
      totalTaxPaid += outcome.taxPaid;
      totalWithdrawn += outcome.paid + outcome.taxPaid;
      payoff = { ...payoff, taxPaid: outcome.taxPaid, fullyPaid: outcome.paid >= payoff.amount - 0.01 };
    }

    // --- 1. ISA (tax-free) ---
    if (remainingNeeded > 0 && p.isa > 0) {
      const withdraw = Math.min(remainingNeeded, p.isa);
      p.isa -= withdraw;
      remainingNeeded -= withdraw;
      totalWithdrawn += withdraw;
    }

    // --- 2. LISA (tax-free if age >= 60, else skip unless desperately needed) ---
    if (remainingNeeded > 0 && p.lisa > 0 && age >= TAX.lisaAccessAge) {
      const withdraw = Math.min(remainingNeeded, p.lisa);
      p.lisa -= withdraw;
      remainingNeeded -= withdraw;
      totalWithdrawn += withdraw;
    }

    // --- 3. Cash ---
    if (remainingNeeded > 0 && p.cash > 0) {
      const withdraw = Math.min(remainingNeeded, p.cash);
      p.cash -= withdraw;
      remainingNeeded -= withdraw;
      totalWithdrawn += withdraw;
    }

    // --- 4. Pension (if age >= pensionAccessAge) via UFPLS ---
    let taxablePensionDrawn = 0;
    if (remainingNeeded > 0 && p.pension > 0 && age >= pensionAccessAge) {
      const grossNeeded = grossPensionWithdrawalNeeded(remainingNeeded, statePensionGross + mortgageTaxablePension);
      const gross = Math.min(grossNeeded, p.pension);
      taxablePensionDrawn = gross * (1 - TAX.pensionTaxFreeFraction);
      const taxOnPension =
        calculateIncomeTax(statePensionGross + mortgageTaxablePension + taxablePensionDrawn) -
        calculateIncomeTax(statePensionGross + mortgageTaxablePension);
      const net = gross - taxOnPension;

      p.pension -= gross;
      remainingNeeded -= net;
      totalWithdrawn += gross;
      totalTaxPaid += taxOnPension;
      if (remainingNeeded < 0) remainingNeeded = 0;
    }

    // --- 5. GIA (with CGT) ---
    if (remainingNeeded > 0 && p.gia > 0) {
      // CGT band depends on total taxable income this year: state pension + taxable pension drawn
      const taxableIncomeForCGT = statePensionGross + mortgageTaxablePension + taxablePensionDrawn;

      // Gains fraction of current GIA
      const gainsFraction = p.gia > 0 ? Math.max(0, p.gia - giaCostBasis) / p.gia : 0;

      // Binary search: find gross withdrawal from GIA such that net = remainingNeeded
      let lo = 0;
      let hi = Math.min(remainingNeeded * 3, p.gia);
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        const gains = mid * gainsFraction;
        const cgt = calculateCGT(gains, taxableIncomeForCGT);
        const net = mid - cgt;
        if (net < remainingNeeded) lo = mid;
        else hi = mid;
      }
      const withdraw = Math.min(hi, p.gia);
      const gains = withdraw * gainsFraction;
      const cgt = calculateCGT(gains, taxableIncomeForCGT);

      // Update cost basis proportionally
      giaCostBasis = giaCostBasis * (1 - withdraw / p.gia);
      p.gia -= withdraw;
      remainingNeeded = Math.max(0, remainingNeeded - (withdraw - cgt));
      totalWithdrawn += withdraw;
      totalTaxPaid += cgt;
    }

    // --- 6. LISA with penalty (last resort, before pension age) ---
    if (remainingNeeded > 0 && p.lisa > 0 && age < TAX.lisaAccessAge) {
      // 25% penalty on full amount
      const effectiveRate = 0.75; // get 75p per £1 withdrawn (lose bonus + some principal)
      const withdraw = Math.min(p.lisa, remainingNeeded / effectiveRate);
      const net = withdraw * effectiveRate;
      p.lisa -= withdraw;
      const penalty = withdraw * TAX.lisaWithdrawalPenaltyRate;
      totalWithdrawn += withdraw;
      totalTaxPaid += penalty;
      remainingNeeded = Math.max(0, remainingNeeded - net);
    }

    const snapshot: DrawdownYear = {
      age,
      year: new Date().getFullYear() + (age - (inputs.currentAge ?? retirementAge)),
      portfolioValue: totalPortfolio(p),
      cash: p.cash,
      pension: p.pension,
      isa: p.isa,
      lisa: p.lisa,
      gia: p.gia,
      totalWithdrawn,
      totalTaxPaid,
      statePensionIncome: statePensionNet,
      portfolioIncome: neededFromPortfolio - Math.max(0, remainingNeeded),
      isaBridgeOnly: age < pensionAccessAge,
    };
    years.push(snapshot);

    // Grow portfolio for next year. GIA cost basis stays fixed — all growth is gain.
    p = growPortfolio(p, realReturnRate);

    if (totalPortfolio(p) <= 0) {
      years.push({
        age: age + 1,
        year: new Date().getFullYear() + (age + 1 - (inputs.currentAge ?? retirementAge)),
        portfolioValue: 0,
        cash: 0,
        pension: 0,
        isa: 0,
        lisa: 0,
        gia: 0,
        totalWithdrawn: 0,
        totalTaxPaid: 0,
        statePensionIncome: 0,
        portfolioIncome: 0,
        isaBridgeOnly: false,
      });
      break;
    }
  }

  return { years, payoff };
}

/**
 * Checks whether the non-pension portfolio can bridge to pensionAccessAge.
 */
function checkBridgeGap(
  inputs: RetirementInputs,
  portfolioAtRetirement: Portfolio
): { canBridge: boolean; bridgePortfolio: Portfolio } {
  const { retirementAge, pensionAccessAge, targetAnnualSpending, realReturnRate, eligibleForStatePension, statePensionAnnual, statePensionAge } = inputs;

  if (retirementAge >= pensionAccessAge) {
    return { canBridge: true, bridgePortfolio: portfolioAtRetirement };
  }

  let p: Portfolio = { ...portfolioAtRetirement };
  let giaCostBasis = portfolioAtRetirement.gia;

  const mortgageBalance = inputs.hasMortgage ? inputs.mortgageRemaining : 0;
  const mortgagePayoffAge = Math.max(retirementAge, inputs.mortgagePayoffAge);

  for (let age = retirementAge; age < pensionAccessAge; age++) {
    const statePensionGross = eligibleForStatePension && age >= statePensionAge ? statePensionAnnual : 0;
    const statePensionNet = statePensionGross > 0 ? netStatePension(statePensionGross) : 0;

    // Clear the mortgage if this is the chosen year. Before pension access the
    // pension is locked, so payMortgageLumpSum will overflow to cash/ISA/GIA.
    if (mortgageBalance > 0 && age === mortgagePayoffAge) {
      const outcome = payMortgageLumpSum(p, giaCostBasis, mortgageBalance, inputs.mortgagePayoffSource, age, pensionAccessAge, statePensionGross);
      giaCostBasis = outcome.giaCostBasis;
      if (outcome.paid < mortgageBalance - 0.01) {
        // Couldn't clear the mortgage from bridge assets without the pension.
        return { canBridge: false, bridgePortfolio: p };
      }
    }

    let needed = Math.max(0, targetAnnualSpending - statePensionNet);

    // ISA
    const isaW = Math.min(needed, p.isa);
    p.isa -= isaW;
    needed -= isaW;

    // LISA (penalty-free only if >= 60, else skip during bridge)
    if (age >= TAX.lisaAccessAge) {
      const lisaW = Math.min(needed, p.lisa);
      p.lisa -= lisaW;
      needed -= lisaW;
    }

    // Cash
    const cashW = Math.min(needed, p.cash);
    p.cash -= cashW;
    needed -= cashW;

    // GIA — include state pension in taxable income so CGT rate band is correct
    if (needed > 0 && p.gia > 0) {
      const gainsFraction = p.gia > 0 ? Math.max(0, p.gia - giaCostBasis) / p.gia : 0;
      let lo = 0, hi = Math.min(needed * 3, p.gia);
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        const cgt = calculateCGT(mid * gainsFraction, statePensionGross);
        if (mid - cgt < needed) lo = mid; else hi = mid;
      }
      const giaW = Math.min(hi, p.gia);
      giaCostBasis = giaCostBasis * (1 - giaW / p.gia);
      p.gia -= giaW;
      needed = Math.max(0, needed - (giaW - calculateCGT(giaW * gainsFraction, statePensionGross)));
    }

    if (needed > 0) {
      // Can't bridge without pension or LISA penalty
      return { canBridge: false, bridgePortfolio: p };
    }

    // Grow non-pension assets; pension stays locked; cost basis stays flat
    p = { ...growPortfolio(p, realReturnRate), pension: p.pension };
  }

  return { canBridge: true, bridgePortfolio: p };
}

/**
 * Finds the earliest age at which the user can retire given current trajectory.
 */
function findEarliestRetirementAge(inputs: RetirementInputs): number | null {
  const mortgageCost = inputs.hasMortgage ? inputs.mortgageRemaining : 0;
  for (let testAge = inputs.currentAge + 1; testAge <= 75; testAge++) {
    const testInputs = { ...inputs, retirementAge: testAge };
    const port = accumulatePortfolio(testInputs);
    const total = totalPortfolio(port);
    const swrIncome = Math.max(0, total - mortgageCost) * inputs.swr;
    if (swrIncome >= inputs.targetAnnualSpending) {
      // Also check bridge gap
      if (testAge < inputs.pensionAccessAge) {
        const { canBridge } = checkBridgeGap(testInputs, port);
        if (canBridge) return testAge;
      } else {
        return testAge;
      }
    }
  }
  return null;
}

export function calculateRetirement(inputs: RetirementInputs): RetirementResults {
  const portfolioAtRetirement = accumulatePortfolio(inputs);
  const totalAtRetirement = totalPortfolio(portfolioAtRetirement);

  // The mortgage is a committed liability that will leave the pot at the chosen
  // payoff age (modelled year-by-year in the drawdown below). For the SWR
  // sustainability headline we reduce the base by the outstanding balance, which
  // is timing-independent and conservative.
  const mortgageCost = inputs.hasMortgage ? inputs.mortgageRemaining : 0;
  const swrBase = Math.max(0, totalAtRetirement - mortgageCost);

  const swrIncome = swrBase * inputs.swr;
  const canRetire = swrIncome >= inputs.targetAnnualSpending;
  const shortfall = Math.max(0, inputs.targetAnnualSpending - swrIncome);

  const needsBridge = inputs.retirementAge < inputs.pensionAccessAge;
  const { canBridge, bridgePortfolio } = needsBridge
    ? checkBridgeGap(inputs, portfolioAtRetirement)
    : { canBridge: true, bridgePortfolio: portfolioAtRetirement };

  // LISA penalty warning: retiring before 60 with a LISA balance
  const lisaPenaltyWarning = inputs.retirementAge < TAX.lisaAccessAge && portfolioAtRetirement.lisa > 0;

  const { years: drawdownYears, payoff: mortgagePayoff } = simulateDrawdown(inputs, portfolioAtRetirement);

  // Find age portfolio is exhausted
  const exhaustedEntry = drawdownYears.find((y) => y.portfolioValue <= 0);
  const portfolioExhaustedAge = exhaustedEntry ? exhaustedEntry.age : null;

  const ageCanRetire = canRetire ? inputs.retirementAge : findEarliestRetirementAge(inputs);

  return {
    canRetire,
    portfolioAtRetirement,
    portfolioValueAtRetirement: totalAtRetirement,
    swrIncomeAtRetirement: swrIncome,
    shortfallAtRetirement: shortfall,
    needsBridge,
    bridgePortfolio,
    bridgeYears: Math.max(0, inputs.pensionAccessAge - inputs.retirementAge),
    canBridgeGap: canBridge,
    lisaPenaltyWarning,
    mortgagePayoff,
    drawdownYears,
    portfolioExhaustedAge,
    ageCanRetire,
  };
}
