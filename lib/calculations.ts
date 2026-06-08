import {
  Portfolio,
  Person,
  RetirementInputs,
  RetirementResults,
  DrawdownYear,
  ChartMarker,
  MortgagePayoffSource,
} from "./types";
import { TAX, calculateIncomeTax, calculateCGT, grossPensionWithdrawalNeeded } from "./tax";

const POT_PENSION_COLOR = "#6366f1";
const POT_GIA_COLOR = "#f43f5e";

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

function emptyPortfolio(): Portfolio {
  return { cash: 0, pension: 0, isa: 0, lisa: 0, gia: 0 };
}

function addPortfolios(a: Portfolio, b: Portfolio): Portfolio {
  return {
    cash: a.cash + b.cash,
    pension: a.pension + b.pension,
    isa: a.isa + b.isa,
    lisa: a.lisa + b.lisa,
    gia: a.gia + b.gia,
  };
}

/**
 * Accumulates one person's portfolio from their currentAge to their
 * retirementAge, applying contributions and growth each year.
 */
function accumulatePerson(person: Person, realReturnRate: number): Portfolio {
  const { currentAge, retirementAge, portfolio, contributions } = person;
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

/** Year (offset from now) at which the household starts drawing down: the later of the retirement ages. */
function householdRetireYear(people: Person[]): number {
  return Math.max(...people.map((p) => p.retirementAge - p.currentAge));
}

/** Year (offset from now) at which the first pension becomes accessible to anyone. */
function firstPensionAccessYear(people: Person[], pensionAccessAge: number): number {
  return Math.min(...people.map((p) => pensionAccessAge - p.currentAge));
}

/**
 * Per-person portfolio at the moment the household starts drawing down: each
 * person accumulates to their own retirement age, then any earlier-retiring
 * person's pot keeps growing (no new contributions) until the household
 * retirement year.
 */
function portfoliosAtHouseholdRetirement(inputs: RetirementInputs): Portfolio[] {
  const retireYear = householdRetireYear(inputs.people);
  return inputs.people.map((person) => {
    let p = accumulatePerson(person, inputs.realReturnRate);
    const personRetireYear = person.retirementAge - person.currentAge;
    for (let y = personRetireYear; y < retireYear; y++) {
      p = growPortfolio(p, inputs.realReturnRate);
    }
    return p;
  });
}

/**
 * Mutable per-person state during the drawdown simulation.
 */
interface PersonState {
  person: Person;
  pot: Portfolio;
  giaCostBasis: number;
}

interface MortgagePayoffOutcome {
  taxPaid: number;
  paid: number;
  giaCostBasis: number;
  taxablePension: number;
}

/**
 * Clears `amount` off the mortgage from a single person's pots, draining the
 * chosen source first and overflowing into that person's other pots if short.
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
      const cgt = calculateCGT(mid * gainsFraction, otherTaxableIncome + taxablePension);
      if (mid - cgt < remaining) lo = mid;
      else hi = mid;
    }
    const w = Math.min(hi, p.gia);
    const cgt = calculateCGT(w * gainsFraction, otherTaxableIncome + taxablePension);
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
 * Simulates the household drawdown year by year from the household retirement
 * year. Each person's pots are drawn with their own income-tax bands; pension
 * and state pension respect each person's own access/start age.
 */
function simulateDrawdown(
  inputs: RetirementInputs,
  perPersonAtRetirement: Portfolio[]
): { years: DrawdownYear[]; payoff: RetirementResults["mortgagePayoff"] } {
  const { people, realReturnRate, targetAnnualSpending, pensionAccessAge } = inputs;
  const primary = people[0];
  const retireYear = householdRetireYear(people);
  const youngestCurrentAge = Math.min(...people.map((p) => p.currentAge));

  const states: PersonState[] = people.map((person, i) => ({
    person,
    pot: { ...perPersonAtRetirement[i] },
    giaCostBasis: perPersonAtRetirement[i].gia,
  }));

  const combined = () => states.reduce((acc, s) => addPortfolios(acc, s.pot), emptyPortfolio());

  const mortgageBalance = inputs.hasMortgage ? inputs.mortgageRemaining : 0;
  const householdRetirementAge = primary.currentAge + retireYear;
  const payoffAge = Math.min(100, Math.max(householdRetirementAge, inputs.mortgagePayoffAge));
  const payoffPerson = Math.min(inputs.mortgagePayoffPerson, people.length - 1);
  let payoff: RetirementResults["mortgagePayoff"] =
    mortgageBalance > 0
      ? {
          age: payoffAge,
          source: inputs.mortgagePayoffSource,
          personName: people[payoffPerson].name,
          amount: mortgageBalance,
          taxPaid: 0,
          fullyPaid: false,
        }
      : null;

  const thisYear = new Date().getFullYear();
  const years: DrawdownYear[] = [];

  for (let t = retireYear; youngestCurrentAge + t <= 100; t++) {
    if (totalPortfolio(combined()) <= 0 && t > retireYear) break;

    const primaryAge = primary.currentAge + t;

    // Per-person taxable income accumulator for the year, starting from state pension.
    const taxableIncome: number[] = states.map((s) => {
      const age = s.person.currentAge + t;
      return s.person.eligibleForStatePension && age >= s.person.statePensionAge
        ? s.person.statePensionAnnual
        : 0;
    });
    const statePensionTaxTotal = taxableIncome.reduce((acc, gross) => acc + calculateIncomeTax(gross), 0);
    const statePensionNetTotal = taxableIncome.reduce(
      (acc, gross) => acc + (gross - calculateIncomeTax(gross)),
      0
    );

    const neededFromPortfolio = Math.max(0, targetAnnualSpending - statePensionNetTotal);
    let remaining = neededFromPortfolio;
    let totalTaxPaid = statePensionTaxTotal;
    let totalWithdrawn = 0;

    // --- 0. Mortgage payoff (one-off lump sum in the chosen year) ---
    if (payoff && primaryAge === payoff.age) {
      const s = states[payoffPerson];
      const ageOfPayer = s.person.currentAge + t;
      const outcome = payMortgageLumpSum(
        s.pot,
        s.giaCostBasis,
        payoff.amount,
        payoff.source,
        ageOfPayer,
        pensionAccessAge,
        taxableIncome[payoffPerson]
      );
      s.giaCostBasis = outcome.giaCostBasis;
      taxableIncome[payoffPerson] += outcome.taxablePension;
      totalTaxPaid += outcome.taxPaid;
      totalWithdrawn += outcome.paid + outcome.taxPaid;
      payoff = { ...payoff, taxPaid: outcome.taxPaid, fullyPaid: outcome.paid >= payoff.amount - 0.01 };
    }

    // --- 1. ISA (tax-free), across everyone ---
    for (const s of states) {
      if (remaining <= 0) break;
      const w = Math.min(remaining, s.pot.isa);
      s.pot.isa -= w;
      remaining -= w;
      totalWithdrawn += w;
    }

    // --- 2. LISA (tax-free once 60), across everyone old enough ---
    for (const s of states) {
      if (remaining <= 0) break;
      const age = s.person.currentAge + t;
      if (age < TAX.lisaAccessAge) continue;
      const w = Math.min(remaining, s.pot.lisa);
      s.pot.lisa -= w;
      remaining -= w;
      totalWithdrawn += w;
    }

    // --- 3. Cash, across everyone ---
    for (const s of states) {
      if (remaining <= 0) break;
      const w = Math.min(remaining, s.pot.cash);
      s.pot.cash -= w;
      remaining -= w;
      totalWithdrawn += w;
    }

    // --- 4. Pension (UFPLS) for anyone old enough, taxed in their own bands ---
    for (let i = 0; i < states.length; i++) {
      if (remaining <= 0) break;
      const s = states[i];
      const age = s.person.currentAge + t;
      if (age < pensionAccessAge || s.pot.pension <= 0) continue;
      const grossNeeded = grossPensionWithdrawalNeeded(remaining, taxableIncome[i]);
      const gross = Math.min(grossNeeded, s.pot.pension);
      const taxable = gross * (1 - TAX.pensionTaxFreeFraction);
      const taxOnPension =
        calculateIncomeTax(taxableIncome[i] + taxable) - calculateIncomeTax(taxableIncome[i]);
      const net = gross - taxOnPension;
      s.pot.pension -= gross;
      taxableIncome[i] += taxable;
      remaining = Math.max(0, remaining - net);
      totalWithdrawn += gross;
      totalTaxPaid += taxOnPension;
    }

    // --- 5. GIA (with CGT), in each person's own band ---
    for (let i = 0; i < states.length; i++) {
      if (remaining <= 0) break;
      const s = states[i];
      if (s.pot.gia <= 0) continue;
      const gainsFraction = Math.max(0, s.pot.gia - s.giaCostBasis) / s.pot.gia;
      let lo = 0;
      let hi = Math.min(remaining * 3, s.pot.gia);
      for (let k = 0; k < 50; k++) {
        const mid = (lo + hi) / 2;
        const cgt = calculateCGT(mid * gainsFraction, taxableIncome[i]);
        if (mid - cgt < remaining) lo = mid;
        else hi = mid;
      }
      const w = Math.min(hi, s.pot.gia);
      const cgt = calculateCGT(w * gainsFraction, taxableIncome[i]);
      s.giaCostBasis = s.giaCostBasis * (1 - w / s.pot.gia);
      s.pot.gia -= w;
      remaining = Math.max(0, remaining - (w - cgt));
      totalWithdrawn += w;
      totalTaxPaid += cgt;
    }

    // --- 6. LISA with penalty (last resort, before age 60) ---
    for (const s of states) {
      if (remaining <= 0) break;
      const age = s.person.currentAge + t;
      if (age >= TAX.lisaAccessAge || s.pot.lisa <= 0) continue;
      const effectiveRate = 0.75; // get 75p per £1 withdrawn
      const w = Math.min(s.pot.lisa, remaining / effectiveRate);
      const net = w * effectiveRate;
      s.pot.lisa -= w;
      const penalty = w * TAX.lisaWithdrawalPenaltyRate;
      totalWithdrawn += w;
      totalTaxPaid += penalty;
      remaining = Math.max(0, remaining - net);
    }

    const c = combined();
    const noPensionAccessible = states.every((s) => s.person.currentAge + t < pensionAccessAge);
    years.push({
      age: primaryAge,
      year: thisYear + t,
      portfolioValue: totalPortfolio(c),
      cash: c.cash,
      pension: c.pension,
      isa: c.isa,
      lisa: c.lisa,
      gia: c.gia,
      totalWithdrawn,
      totalTaxPaid,
      statePensionIncome: statePensionNetTotal,
      portfolioIncome: neededFromPortfolio - Math.max(0, remaining),
      isaBridgeOnly: noPensionAccessible,
    });

    // Grow every pot for next year. GIA cost basis stays fixed.
    for (const s of states) s.pot = growPortfolio(s.pot, realReturnRate);

    if (totalPortfolio(combined()) <= 0) {
      years.push({
        age: primaryAge + 1,
        year: thisYear + t + 1,
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
 * Checks whether the household's non-pension assets can bridge from household
 * retirement until the first pension becomes accessible to anyone.
 */
function checkBridgeGap(
  inputs: RetirementInputs,
  perPersonAtRetirement: Portfolio[]
): { canBridge: boolean; bridgePortfolio: Portfolio } {
  const { people, pensionAccessAge, targetAnnualSpending, realReturnRate } = inputs;
  const retireYear = householdRetireYear(people);
  const accessYear = firstPensionAccessYear(people, pensionAccessAge);

  const combined = (sts: PersonState[]) =>
    sts.reduce((acc, s) => addPortfolios(acc, s.pot), emptyPortfolio());

  if (retireYear >= accessYear) {
    return { canBridge: true, bridgePortfolio: combined(
      people.map((person, i) => ({ person, pot: perPersonAtRetirement[i], giaCostBasis: 0 }))
    ) };
  }

  const states: PersonState[] = people.map((person, i) => ({
    person,
    pot: { ...perPersonAtRetirement[i] },
    giaCostBasis: perPersonAtRetirement[i].gia,
  }));

  const mortgageBalance = inputs.hasMortgage ? inputs.mortgageRemaining : 0;
  const primary = people[0];
  const householdRetirementAge = primary.currentAge + retireYear;
  const payoffAge = Math.max(householdRetirementAge, inputs.mortgagePayoffAge);
  const payoffPerson = Math.min(inputs.mortgagePayoffPerson, people.length - 1);

  for (let t = retireYear; t < accessYear; t++) {
    const primaryAge = primary.currentAge + t;

    const taxableIncome: number[] = states.map((s) => {
      const age = s.person.currentAge + t;
      return s.person.eligibleForStatePension && age >= s.person.statePensionAge
        ? s.person.statePensionAnnual
        : 0;
    });
    const statePensionNetTotal = taxableIncome.reduce(
      (acc, gross) => acc + (gross - calculateIncomeTax(gross)),
      0
    );

    // Mortgage payoff within the bridge window: pension is locked, so it
    // overflows into the payer's non-pension pots.
    if (mortgageBalance > 0 && primaryAge === payoffAge) {
      const s = states[payoffPerson];
      const ageOfPayer = s.person.currentAge + t;
      const outcome = payMortgageLumpSum(
        s.pot,
        s.giaCostBasis,
        mortgageBalance,
        inputs.mortgagePayoffSource,
        ageOfPayer,
        pensionAccessAge,
        taxableIncome[payoffPerson]
      );
      s.giaCostBasis = outcome.giaCostBasis;
      if (outcome.paid < mortgageBalance - 0.01) {
        return { canBridge: false, bridgePortfolio: combined(states) };
      }
    }

    let remaining = Math.max(0, targetAnnualSpending - statePensionNetTotal);

    // ISA
    for (const s of states) {
      if (remaining <= 0) break;
      const w = Math.min(remaining, s.pot.isa);
      s.pot.isa -= w;
      remaining -= w;
    }
    // LISA (penalty-free only once 60)
    for (const s of states) {
      if (remaining <= 0) break;
      if (s.person.currentAge + t < TAX.lisaAccessAge) continue;
      const w = Math.min(remaining, s.pot.lisa);
      s.pot.lisa -= w;
      remaining -= w;
    }
    // Cash
    for (const s of states) {
      if (remaining <= 0) break;
      const w = Math.min(remaining, s.pot.cash);
      s.pot.cash -= w;
      remaining -= w;
    }
    // GIA (with CGT in each person's band)
    for (let i = 0; i < states.length; i++) {
      if (remaining <= 0) break;
      const s = states[i];
      if (s.pot.gia <= 0) continue;
      const gainsFraction = Math.max(0, s.pot.gia - s.giaCostBasis) / s.pot.gia;
      let lo = 0;
      let hi = Math.min(remaining * 3, s.pot.gia);
      for (let k = 0; k < 50; k++) {
        const mid = (lo + hi) / 2;
        const cgt = calculateCGT(mid * gainsFraction, taxableIncome[i]);
        if (mid - cgt < remaining) lo = mid;
        else hi = mid;
      }
      const w = Math.min(hi, s.pot.gia);
      const cgt = calculateCGT(w * gainsFraction, taxableIncome[i]);
      s.giaCostBasis = s.giaCostBasis * (1 - w / s.pot.gia);
      s.pot.gia -= w;
      remaining = Math.max(0, remaining - (w - cgt));
    }

    if (remaining > 0) {
      return { canBridge: false, bridgePortfolio: combined(states) };
    }

    // Grow non-pension assets; pensions stay locked.
    for (const s of states) {
      const pension = s.pot.pension;
      s.pot = { ...growPortfolio(s.pot, realReturnRate), pension };
    }
  }

  return { canBridge: true, bridgePortfolio: combined(states) };
}

/**
 * Finds the earliest household retirement (primary age) reachable by having
 * everyone work `delta` more years, if any.
 */
function findEarliestRetirementAge(inputs: RetirementInputs): number | null {
  const primary = inputs.people[0];
  const baseRetireYear = householdRetireYear(inputs.people);
  const mortgageCost = inputs.hasMortgage ? inputs.mortgageRemaining : 0;

  for (let delta = 0; primary.currentAge + baseRetireYear + delta <= 75; delta++) {
    const testInputs: RetirementInputs = {
      ...inputs,
      people: inputs.people.map((p) => ({ ...p, retirementAge: p.retirementAge + delta })),
    };
    const perPerson = portfoliosAtHouseholdRetirement(testInputs);
    const total = perPerson.reduce((acc, p) => acc + totalPortfolio(p), 0);
    const swrIncome = Math.max(0, total - mortgageCost) * inputs.swr;
    if (swrIncome < inputs.targetAnnualSpending) continue;

    const retireYear = householdRetireYear(testInputs.people);
    const accessYear = firstPensionAccessYear(testInputs.people, inputs.pensionAccessAge);
    if (retireYear < accessYear) {
      const { canBridge } = checkBridgeGap(testInputs, perPerson);
      if (!canBridge) continue;
    }
    return primary.currentAge + retireYear;
  }
  return null;
}

function buildChartMarkers(inputs: RetirementInputs, householdRetirementAge: number): ChartMarker[] {
  const primary = inputs.people[0];
  const solo = inputs.people.length === 1;
  const markers: ChartMarker[] = [];

  inputs.people.forEach((person) => {
    // Pension access, mapped onto the primary person's age axis.
    const accessPrimaryAge = primary.currentAge + (inputs.pensionAccessAge - person.currentAge);
    if (accessPrimaryAge > householdRetirementAge) {
      markers.push({
        age: accessPrimaryAge,
        label: solo ? "Pension access" : `${person.name}: pension`,
        color: POT_PENSION_COLOR,
      });
    }
    // State pension start, mapped onto the primary person's age axis.
    if (person.eligibleForStatePension) {
      const spPrimaryAge = primary.currentAge + (person.statePensionAge - person.currentAge);
      if (spPrimaryAge > householdRetirementAge) {
        markers.push({
          age: spPrimaryAge,
          label: solo ? "State pension" : `${person.name}: state pension`,
          color: POT_GIA_COLOR,
        });
      }
    }
  });

  return markers;
}

export function calculateRetirement(inputs: RetirementInputs): RetirementResults {
  const primary = inputs.people[0];
  const retireYear = householdRetireYear(inputs.people);
  const householdRetirementAge = primary.currentAge + retireYear;

  const perPersonAtRetirement = portfoliosAtHouseholdRetirement(inputs);
  const portfolioAtRetirement = perPersonAtRetirement.reduce(
    (acc, p) => addPortfolios(acc, p),
    emptyPortfolio()
  );
  const totalAtRetirement = totalPortfolio(portfolioAtRetirement);

  // The mortgage is a committed liability cleared during drawdown; for the SWR
  // headline we conservatively reduce the base by the outstanding balance.
  const mortgageCost = inputs.hasMortgage ? inputs.mortgageRemaining : 0;
  const swrBase = Math.max(0, totalAtRetirement - mortgageCost);
  const swrIncome = swrBase * inputs.swr;
  const canRetire = swrIncome >= inputs.targetAnnualSpending;
  const shortfall = Math.max(0, inputs.targetAnnualSpending - swrIncome);

  const accessYear = firstPensionAccessYear(inputs.people, inputs.pensionAccessAge);
  const needsBridge = retireYear < accessYear;
  const { canBridge, bridgePortfolio } = needsBridge
    ? checkBridgeGap(inputs, perPersonAtRetirement)
    : { canBridge: true, bridgePortfolio: portfolioAtRetirement };

  // LISA penalty warning: someone reaches household retirement before 60 with a LISA balance.
  const lisaPenaltyWarning = inputs.people.some(
    (person, i) =>
      person.currentAge + retireYear < TAX.lisaAccessAge && perPersonAtRetirement[i].lisa > 0
  );

  const { years: drawdownYears, payoff: mortgagePayoff } = simulateDrawdown(inputs, perPersonAtRetirement);

  const exhaustedEntry = drawdownYears.find((y) => y.portfolioValue <= 0);
  const portfolioExhaustedAge = exhaustedEntry ? exhaustedEntry.age : null;

  const ageCanRetire = canRetire ? householdRetirementAge : findEarliestRetirementAge(inputs);

  return {
    canRetire,
    portfolioAtRetirement,
    portfolioValueAtRetirement: totalAtRetirement,
    swrIncomeAtRetirement: swrIncome,
    shortfallAtRetirement: shortfall,
    householdRetirementAge,
    needsBridge,
    bridgePortfolio,
    bridgeYears: Math.max(0, accessYear - retireYear),
    canBridgeGap: canBridge,
    lisaPenaltyWarning,
    mortgagePayoff,
    drawdownYears,
    chartMarkers: buildChartMarkers(inputs, householdRetirementAge),
    portfolioExhaustedAge,
    ageCanRetire,
  };
}
