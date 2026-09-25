/**
 * VELQOARATH — STRUCTURED CONTRADICTION ENGINE
 *
 * Identifies, structures, and audits conflicting cross-currents
 * between market price momentum, macro fundamentals, central bank stances,
 * expectations, and catalysts.
 *
 * PHILOSOPHY:
 * Contradictions are not simply a mysterious negative number; they are
 * real macroeconomic tensions that traders and institutions must evaluate.
 */

import { CurrencyPair, CurrencyState, PairOrientationDirection, FundamentalDifferential } from '../../types';
import { StructuredContradiction, ContradictionCategory, ContradictionSeverity } from '../../types/intelligence';

export interface ContradictionEvaluationParams {
  pair: CurrencyPair;
  baseState: CurrencyState;
  quoteState: CurrencyState;
  relativeStrengthDelta: number | null;
  orientationDirection: PairOrientationDirection;
  fundamentalDiff?: FundamentalDifferential;
  now?: Date;
}

export function evaluateStructuredContradictions(
  params: ContradictionEvaluationParams
): {
  contradictions: StructuredContradiction[];
  totalPenaltyPoints: number;
} {
  const {
    pair,
    baseState,
    quoteState,
    relativeStrengthDelta,
    orientationDirection,
    fundamentalDiff,
    now = new Date()
  } = params;

  const contradictions: StructuredContradiction[] = [];
  const nowIso = now.toISOString();

  const isBullishBase = orientationDirection === 'BULLISH_BASE';
  const isBearishBase = orientationDirection === 'BEARISH_BASE';
  const fundDelta = fundamentalDiff?.fundamentalDifferential?.delta ?? null;
  const policySpread = fundamentalDiff?.policyDifferential?.rateSpread ?? null;
  const baseStance = baseState.centralBank?.stance;
  const quoteStance = quoteState.centralBank?.stance;

  // 1. MARKET PRICE MOMENTUM VS MACRO FUNDAMENTALS DIVERGENCE
  if (fundDelta !== null && relativeStrengthDelta !== null) {
    if (isBullishBase && fundDelta < -0.04) {
      contradictions.push({
        id: `contra-${pair.symbol.toLowerCase()}-mkt-vs-fund`,
        pair: pair.symbol,
        currency: pair.baseCurrency,
        category: 'MARKET_VS_FUNDAMENTAL',
        sourceA: 'Market Price Action (Basket Relative Strength)',
        sourceB: 'Macro Fundamentals Aggregate Score',
        statementA: `Market strength favors ${pair.baseCurrency} (Δ = +${relativeStrengthDelta.toFixed(2)}%)`,
        statementB: `Macroeconomic fundamentals favor ${pair.quoteCurrency} (Fund Δ = ${fundDelta.toFixed(2)})`,
        conflictDescription: `Market price momentum is rising while macroeconomic fundamentals for ${pair.baseCurrency} are deteriorating relative to ${pair.quoteCurrency}.`,
        directionA: 'BULLISH_BASE',
        directionB: 'BEARISH_BASE',
        severity: 'HIGH',
        directionalImpact: 'Divergence signals rally may lack structural fundamental backing.',
        penaltyPoints: 15,
        status: 'UNRESOLVED',
        detectedTimestamp: nowIso,
        sourceTimestamps: {
          sourceA: nowIso,
          sourceB: nowIso
        },
        provenance: 'Automated differential reconciliation across price and verified macroeconomic prints.'
      });
    } else if (isBearishBase && fundDelta > 0.04) {
      contradictions.push({
        id: `contra-${pair.symbol.toLowerCase()}-mkt-vs-fund`,
        pair: pair.symbol,
        currency: pair.quoteCurrency,
        category: 'MARKET_VS_FUNDAMENTAL',
        sourceA: 'Market Price Action (Basket Relative Strength)',
        sourceB: 'Macro Fundamentals Aggregate Score',
        statementA: `Market strength favors ${pair.quoteCurrency} (Δ = ${relativeStrengthDelta.toFixed(2)}%)`,
        statementB: `Macroeconomic fundamentals favor ${pair.baseCurrency} (Fund Δ = +${fundDelta.toFixed(2)})`,
        conflictDescription: `Market price momentum is depressing ${pair.baseCurrency} despite structurally superior macroeconomic fundamentals.`,
        directionA: 'BEARISH_BASE',
        directionB: 'BULLISH_BASE',
        severity: 'HIGH',
        directionalImpact: 'Downward price trend conflicts with underlying growth and inflation resilience.',
        penaltyPoints: 15,
        status: 'UNRESOLVED',
        detectedTimestamp: nowIso,
        sourceTimestamps: {
          sourceA: nowIso,
          sourceB: nowIso
        },
        provenance: 'Automated differential reconciliation across price and verified macroeconomic prints.'
      });
    }
  }

  // 2. MONETARY POLICY VS MARKET MOMENTUM (CARRY COMPRESSION RISK)
  if (policySpread !== null) {
    if (isBullishBase && baseStance === 'DOVISH' && policySpread > 0) {
      contradictions.push({
        id: `contra-${pair.symbol.toLowerCase()}-policy-vs-market`,
        pair: pair.symbol,
        currency: pair.baseCurrency,
        category: 'POLICY_VS_MARKET',
        sourceA: `${baseState.centralBank.institution} Policy Guidance`,
        sourceB: 'Nominal Policy Rate Spread',
        statementA: `${baseState.centralBank.institution} policy stance is DOVISH / easing`,
        statementB: `Nominal carry differential is currently positive (+${policySpread.toFixed(2)}%)`,
        conflictDescription: `${baseState.centralBank.institution} is actively easing, threatening to compress the nominal yield advantage supporting ${pair.baseCurrency}.`,
        directionA: 'BEARISH_BASE',
        directionB: 'BULLISH_BASE',
        severity: 'MEDIUM',
        directionalImpact: 'Carry advantage eroding due to central bank rate-cutting cycle.',
        penaltyPoints: 8,
        status: 'UNRESOLVED',
        detectedTimestamp: nowIso,
        sourceTimestamps: {
          sourceA: baseState.centralBank.sourceMetadata?.lastUpdated || null,
          sourceB: nowIso
        },
        provenance: 'Official Central Bank Communications and Policy Announcements'
      });
    } else if (isBearishBase && quoteStance === 'DOVISH' && policySpread < 0) {
      contradictions.push({
        id: `contra-${pair.symbol.toLowerCase()}-policy-vs-market`,
        pair: pair.symbol,
        currency: pair.quoteCurrency,
        category: 'POLICY_VS_MARKET',
        sourceA: `${quoteState.centralBank.institution} Policy Guidance`,
        sourceB: 'Nominal Policy Rate Spread',
        statementA: `${quoteState.centralBank.institution} policy stance is DOVISH / easing`,
        statementB: `Nominal carry differential favors quote currency by +${Math.abs(policySpread).toFixed(2)}%`,
        conflictDescription: `${quoteState.centralBank.institution} is easing policy, threatening yield compression for ${pair.quoteCurrency}.`,
        directionA: 'BULLISH_BASE',
        directionB: 'BEARISH_BASE',
        severity: 'MEDIUM',
        directionalImpact: 'Quote currency yield advantage facing compression from monetary easing.',
        penaltyPoints: 8,
        status: 'UNRESOLVED',
        detectedTimestamp: nowIso,
        sourceTimestamps: {
          sourceA: quoteState.centralBank.sourceMetadata?.lastUpdated || null,
          sourceB: nowIso
        },
        provenance: 'Official Central Bank Communications and Policy Announcements'
      });
    }
  }

  // 3. EXPECTATIONS VS PRICE ACTION
  const expDiff = fundamentalDiff?.expectationsDifferential?.comparison;
  if (expDiff) {
    if (isBullishBase && expDiff.includes(pair.quoteCurrency) && !expDiff.includes('balanced')) {
      contradictions.push({
        id: `contra-${pair.symbol.toLowerCase()}-exp-vs-price`,
        pair: pair.symbol,
        currency: pair.baseCurrency,
        category: 'FUNDAMENTAL_VS_EXPECTATION',
        sourceA: 'Market Price Trajectory',
        sourceB: 'Recent Economic Surprise Record',
        statementA: `Price momentum leans bullish for ${pair.baseCurrency}`,
        statementB: `Recent economic surprises favor ${pair.quoteCurrency}`,
        conflictDescription: `Recent economic surprises are missing expectations for ${pair.baseCurrency} while exceeding for ${pair.quoteCurrency}.`,
        directionA: 'BULLISH_BASE',
        directionB: 'BEARISH_BASE',
        severity: 'LOW',
        directionalImpact: 'Macro surprise momentum leans against current price direction.',
        penaltyPoints: 5,
        status: 'UNRESOLVED',
        detectedTimestamp: nowIso,
        sourceTimestamps: {
          sourceA: nowIso,
          sourceB: nowIso
        },
        provenance: 'Macroeconomic Consensus vs Actual Prints Tracking'
      });
    } else if (isBearishBase && expDiff.includes(pair.baseCurrency) && !expDiff.includes('balanced')) {
      contradictions.push({
        id: `contra-${pair.symbol.toLowerCase()}-exp-vs-price`,
        pair: pair.symbol,
        currency: pair.quoteCurrency,
        category: 'FUNDAMENTAL_VS_EXPECTATION',
        sourceA: 'Market Price Trajectory',
        sourceB: 'Recent Economic Surprise Record',
        statementA: `Price momentum leans bearish for ${pair.baseCurrency}`,
        statementB: `Recent economic surprises favor ${pair.baseCurrency}`,
        conflictDescription: `Recent economic surprises are exceeding expectations for ${pair.baseCurrency}.`,
        directionA: 'BEARISH_BASE',
        directionB: 'BULLISH_BASE',
        severity: 'LOW',
        directionalImpact: 'Macro surprise momentum leans against downward trend.',
        penaltyPoints: 5,
        status: 'UNRESOLVED',
        detectedTimestamp: nowIso,
        sourceTimestamps: {
          sourceA: nowIso,
          sourceB: nowIso
        },
        provenance: 'Macroeconomic Consensus vs Actual Prints Tracking'
      });
    }
  }

  // 4. MULTIPLE COUNTER-THESIS EVIDENCE
  const counterCount =
    (baseState.conflictingEvidence?.length ?? 0) + (quoteState.conflictingEvidence?.length ?? 0);
  if (counterCount >= 2 && contradictions.length === 0) {
    contradictions.push({
      id: `contra-${pair.symbol.toLowerCase()}-mixed-evidence`,
      pair: pair.symbol,
      currency: pair.baseCurrency,
      category: 'OTHER',
      sourceA: `${pair.baseCurrency} Macro Observations`,
      sourceB: `${pair.quoteCurrency} Macro Observations`,
      statementA: baseState.conflictingEvidence[0] || 'Conflicting macroeconomic data recorded',
      statementB: quoteState.conflictingEvidence[0] || 'Conflicting macroeconomic data recorded',
      conflictDescription: 'Cross-cutting observations within domestic indicators prevent clean directional confluence.',
      directionA: 'MIXED',
      directionB: 'MIXED',
      severity: 'LOW',
      directionalImpact: 'Mixed data prints suggest range-bound or rotational market conditions.',
      penaltyPoints: 5,
      status: 'UNRESOLVED',
      detectedTimestamp: nowIso,
      sourceTimestamps: {
        sourceA: nowIso,
        sourceB: nowIso
      },
      provenance: 'Indicator Cross-Section Analysis'
    });
  }

  const totalPenaltyPoints = contradictions.reduce((sum, c) => sum + c.penaltyPoints, 0);

  return {
    contradictions,
    totalPenaltyPoints
  };
}
