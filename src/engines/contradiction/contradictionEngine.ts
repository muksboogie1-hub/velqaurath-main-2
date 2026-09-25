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
  const baseScore = baseState.fundamentalState?.fundamentalScore;
  const quoteScore = quoteState.fundamentalState?.fundamentalScore;
  const fundDelta =
    fundamentalDiff?.fundamentalDifferential?.delta ??
    (baseScore !== undefined && baseScore !== null && quoteScore !== undefined && quoteScore !== null
      ? Math.round((baseScore - quoteScore) * 100) / 100
      : null);
  const policySpread =
    fundamentalDiff?.policyDifferential?.rateSpread ??
    (baseState.centralBank?.currentPolicyRate !== null &&
    baseState.centralBank?.currentPolicyRate !== undefined &&
    quoteState.centralBank?.currentPolicyRate !== null &&
    quoteState.centralBank?.currentPolicyRate !== undefined
      ? Math.round(
          (baseState.centralBank.currentPolicyRate -
            quoteState.centralBank.currentPolicyRate) *
            100
        ) / 100
      : null);
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
        contradictionType: 'MARKET_VS_FUNDAMENTAL',
        sourceA: 'Market Price Action (Basket Relative Strength)',
        sourceB: 'Macro Fundamentals Aggregate Score',
        statementA: `Market strength favors ${pair.baseCurrency} (Δ = +${relativeStrengthDelta.toFixed(2)}%)`,
        statementB: `Macroeconomic fundamentals favor ${pair.quoteCurrency} (Fund Δ = ${fundDelta.toFixed(2)})`,
        conflictDescription: `Market price momentum is rising while macroeconomic fundamentals for ${pair.baseCurrency} are deteriorating relative to ${pair.quoteCurrency}.`,
        description: `Market price momentum is rising while macroeconomic fundamentals for ${pair.baseCurrency} are deteriorating relative to ${pair.quoteCurrency}.`,
        directionA: 'BULLISH_BASE',
        directionB: 'BEARISH_BASE',
        severity: 'HIGH',
        directionalImpact: 'Divergence signals rally may lack structural fundamental backing.',
        penaltyPoints: 15,
        affectedComponents: ['MARKET_STRENGTH', 'FUNDAMENTALS'],
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
        contradictionType: 'MARKET_VS_FUNDAMENTAL',
        sourceA: 'Market Price Action (Basket Relative Strength)',
        sourceB: 'Macro Fundamentals Aggregate Score',
        statementA: `Market strength favors ${pair.quoteCurrency} (Δ = ${relativeStrengthDelta.toFixed(2)}%)`,
        statementB: `Macroeconomic fundamentals favor ${pair.baseCurrency} (Fund Δ = +${fundDelta.toFixed(2)})`,
        conflictDescription: `Market price momentum is depressing ${pair.baseCurrency} despite structurally superior macroeconomic fundamentals.`,
        description: `Market price momentum is depressing ${pair.baseCurrency} despite structurally superior macroeconomic fundamentals.`,
        directionA: 'BEARISH_BASE',
        directionB: 'BULLISH_BASE',
        severity: 'HIGH',
        directionalImpact: 'Downward price trend conflicts with underlying growth and inflation resilience.',
        penaltyPoints: 15,
        affectedComponents: ['MARKET_STRENGTH', 'FUNDAMENTALS'],
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

  // 2. MONETARY POLICY VS MARKET MOMENTUM (POLICY SUPPORTIVE BUT MARKET MOVEMENT CONTRADICTS)
  if (policySpread !== null) {
    if (isBullishBase && baseStance === 'DOVISH' && policySpread > 0) {
      contradictions.push({
        id: `contra-${pair.symbol.toLowerCase()}-policy-vs-market`,
        pair: pair.symbol,
        currency: pair.baseCurrency,
        category: 'POLICY_VS_MARKET',
        contradictionType: 'POLICY_VS_MARKET',
        sourceA: `${baseState.centralBank.institution} Policy Guidance`,
        sourceB: 'Nominal Policy Rate Spread',
        statementA: `${baseState.centralBank.institution} policy stance is DOVISH / easing`,
        statementB: `Nominal carry differential is currently positive (+${policySpread.toFixed(2)}%)`,
        conflictDescription: `${baseState.centralBank.institution} is actively easing, threatening to compress the nominal yield advantage supporting ${pair.baseCurrency}.`,
        description: `${baseState.centralBank.institution} is actively easing, threatening to compress the nominal yield advantage supporting ${pair.baseCurrency}.`,
        directionA: 'BEARISH_BASE',
        directionB: 'BULLISH_BASE',
        severity: 'MEDIUM',
        directionalImpact: 'Carry advantage eroding due to central bank rate-cutting cycle.',
        penaltyPoints: 8,
        affectedComponents: ['POLICY'],
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
        contradictionType: 'POLICY_VS_MARKET',
        sourceA: `${quoteState.centralBank.institution} Policy Guidance`,
        sourceB: 'Nominal Policy Rate Spread',
        statementA: `${quoteState.centralBank.institution} policy stance is DOVISH / easing`,
        statementB: `Nominal carry differential favors quote currency by +${Math.abs(policySpread).toFixed(2)}%`,
        conflictDescription: `${quoteState.centralBank.institution} is easing policy, threatening yield compression for ${pair.quoteCurrency}.`,
        description: `${quoteState.centralBank.institution} is easing policy, threatening yield compression for ${pair.quoteCurrency}.`,
        directionA: 'BULLISH_BASE',
        directionB: 'BEARISH_BASE',
        severity: 'MEDIUM',
        directionalImpact: 'Quote currency yield advantage facing compression from monetary easing.',
        penaltyPoints: 8,
        affectedComponents: ['POLICY'],
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

  // 3. FUNDAMENTALS BULLISH BUT EXPECTATIONS DETERIORATING
  const baseFundScore = (baseState.fundamentalState as any)?.fundamentalScore ?? 0;
  const quoteFundScore = (quoteState.fundamentalState as any)?.fundamentalScore ?? 0;
  const expDiff = fundamentalDiff?.expectationsDifferential?.comparison;

  if (baseFundScore > 0.04 && expDiff && expDiff.includes(pair.quoteCurrency) && !expDiff.includes('balanced')) {
    contradictions.push({
      id: `contra-${pair.symbol.toLowerCase()}-fund-vs-exp`,
      pair: pair.symbol,
      currency: pair.baseCurrency,
      category: 'FUNDAMENTAL_VS_EXPECTATION',
      contradictionType: 'FUNDAMENTAL_VS_EXPECTATION',
      sourceA: `${pair.baseCurrency} Structural Fundamentals`,
      sourceB: `${pair.baseCurrency} Consensus Expectations`,
      statementA: `Macroeconomic fundamentals are expansionary (Score: +${baseFundScore.toFixed(2)})`,
      statementB: `Recent economic prints are missing market forecasts relative to ${pair.quoteCurrency}`,
      conflictDescription: `Structural fundamentals for ${pair.baseCurrency} remain positive, but recent data prints are deteriorating and missing market expectations.`,
      description: `Structural fundamentals for ${pair.baseCurrency} remain positive, but recent data prints are deteriorating and missing market expectations.`,
      directionA: 'BULLISH_BASE',
      directionB: 'BEARISH_BASE',
      severity: 'MEDIUM',
      directionalImpact: 'High hurdle rate; forward momentum vulnerable to expectation repricing.',
      penaltyPoints: 8,
      affectedComponents: ['FUNDAMENTALS', 'EXPECTATIONS'],
      status: 'UNRESOLVED',
      detectedTimestamp: nowIso,
      sourceTimestamps: {
        sourceA: nowIso,
        sourceB: nowIso
      },
      provenance: 'Macroeconomic Consensus vs Actual Prints Tracking'
    });
  } else if (expDiff) {
    if (isBullishBase && expDiff.includes(pair.quoteCurrency) && !expDiff.includes('balanced')) {
      contradictions.push({
        id: `contra-${pair.symbol.toLowerCase()}-exp-vs-price`,
        pair: pair.symbol,
        currency: pair.baseCurrency,
        category: 'FUNDAMENTAL_VS_EXPECTATION',
        contradictionType: 'FUNDAMENTAL_VS_EXPECTATION',
        sourceA: 'Market Price Trajectory',
        sourceB: 'Recent Economic Surprise Record',
        statementA: `Price momentum leans bullish for ${pair.baseCurrency}`,
        statementB: `Recent economic surprises favor ${pair.quoteCurrency}`,
        conflictDescription: `Recent economic surprises are missing expectations for ${pair.baseCurrency} while exceeding for ${pair.quoteCurrency}.`,
        description: `Recent economic surprises are missing expectations for ${pair.baseCurrency} while exceeding for ${pair.quoteCurrency}.`,
        directionA: 'BULLISH_BASE',
        directionB: 'BEARISH_BASE',
        severity: 'LOW',
        directionalImpact: 'Macro surprise momentum leans against current price direction.',
        penaltyPoints: 5,
        affectedComponents: ['EXPECTATIONS', 'MARKET_STRENGTH'],
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
        contradictionType: 'FUNDAMENTAL_VS_EXPECTATION',
        sourceA: 'Market Price Trajectory',
        sourceB: 'Recent Economic Surprise Record',
        statementA: `Price momentum leans bearish for ${pair.baseCurrency}`,
        statementB: `Recent economic surprises favor ${pair.baseCurrency}`,
        conflictDescription: `Recent economic surprises are exceeding expectations for ${pair.baseCurrency}.`,
        description: `Recent economic surprises are exceeding expectations for ${pair.baseCurrency}.`,
        directionA: 'BEARISH_BASE',
        directionB: 'BULLISH_BASE',
        severity: 'LOW',
        directionalImpact: 'Macro surprise momentum leans against downward trend.',
        penaltyPoints: 5,
        affectedComponents: ['EXPECTATIONS', 'MARKET_STRENGTH'],
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

  // 4. STRONG CURRENCY BUT NO LIVE FUNDAMENTAL EVIDENCE (DATA QUALITY CONTRADICTION)
  const baseObsCount = baseState.confidenceMetadata?.observationCount ?? 0;
  const quoteObsCount = quoteState.confidenceMetadata?.observationCount ?? 0;

  if (baseState.marketState === 'STRONG' && baseObsCount === 0) {
    contradictions.push({
      id: `contra-${pair.symbol.toLowerCase()}-strong-base-no-fund`,
      pair: pair.symbol,
      currency: pair.baseCurrency,
      category: 'DATA_QUALITY',
      contradictionType: 'DATA_QUALITY',
      sourceA: 'Market Basket Relative Strength Engine',
      sourceB: 'Live Fundamental Economic Observations',
      statementA: `Market strength evaluates ${pair.baseCurrency} as STRONG (≥ +0.10%)`,
      statementB: `Zero authenticated live fundamental observations recorded for ${pair.baseCurrency}`,
      conflictDescription: `${pair.baseCurrency} is classified as STRONG by market price action, but possesses no live fundamental evidence to substantiate the move.`,
      description: `${pair.baseCurrency} is classified as STRONG by market price action, but possesses no live fundamental evidence to substantiate the move.`,
      directionA: 'BULLISH_BASE',
      directionB: 'DATA_UNAVAILABLE',
      severity: 'MEDIUM',
      directionalImpact: 'Unsubstantiated momentum; move may be technical or speculative.',
      penaltyPoints: 8,
      affectedComponents: ['MARKET_STRENGTH', 'DATA_QUALITY'],
      status: 'UNRESOLVED',
      detectedTimestamp: nowIso,
      sourceTimestamps: {
        sourceA: nowIso,
        sourceB: null
      },
      provenance: 'Data Quality & Provenance Validation'
    });
  }

  if (quoteState.marketState === 'STRONG' && quoteObsCount === 0) {
    contradictions.push({
      id: `contra-${pair.symbol.toLowerCase()}-strong-quote-no-fund`,
      pair: pair.symbol,
      currency: pair.quoteCurrency,
      category: 'DATA_QUALITY',
      contradictionType: 'DATA_QUALITY',
      sourceA: 'Market Basket Relative Strength Engine',
      sourceB: 'Live Fundamental Economic Observations',
      statementA: `Market strength evaluates ${pair.quoteCurrency} as STRONG (≥ +0.10%)`,
      statementB: `Zero authenticated live fundamental observations recorded for ${pair.quoteCurrency}`,
      conflictDescription: `${pair.quoteCurrency} is classified as STRONG by market price action, but possesses no live fundamental evidence to substantiate the move.`,
      description: `${pair.quoteCurrency} is classified as STRONG by market price action, but possesses no live fundamental evidence to substantiate the move.`,
      directionA: 'BEARISH_BASE',
      directionB: 'DATA_UNAVAILABLE',
      severity: 'MEDIUM',
      directionalImpact: 'Unsubstantiated momentum; move may be technical or speculative.',
      penaltyPoints: 8,
      affectedComponents: ['MARKET_STRENGTH', 'DATA_QUALITY'],
      status: 'UNRESOLVED',
      detectedTimestamp: nowIso,
      sourceTimestamps: {
        sourceA: nowIso,
        sourceB: null
      },
      provenance: 'Data Quality & Provenance Validation'
    });
  }

  // 5. MULTIPLE COUNTER-THESIS EVIDENCE
  const counterCount =
    (baseState.conflictingEvidence?.length ?? 0) + (quoteState.conflictingEvidence?.length ?? 0);
  if (counterCount >= 2 && contradictions.length === 0) {
    contradictions.push({
      id: `contra-${pair.symbol.toLowerCase()}-mixed-evidence`,
      pair: pair.symbol,
      currency: pair.baseCurrency,
      category: 'OTHER',
      contradictionType: 'OTHER',
      sourceA: `${pair.baseCurrency} Macro Observations`,
      sourceB: `${pair.quoteCurrency} Macro Observations`,
      statementA: baseState.conflictingEvidence[0] || 'Conflicting macroeconomic data recorded',
      statementB: quoteState.conflictingEvidence[0] || 'Conflicting macroeconomic data recorded',
      conflictDescription: 'Cross-cutting observations within domestic indicators prevent clean directional confluence.',
      description: 'Cross-cutting observations within domestic indicators prevent clean directional confluence.',
      directionA: 'MIXED',
      directionB: 'MIXED',
      severity: 'LOW',
      directionalImpact: 'Mixed data prints suggest range-bound or rotational market conditions.',
      penaltyPoints: 5,
      affectedComponents: ['FUNDAMENTALS'],
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
