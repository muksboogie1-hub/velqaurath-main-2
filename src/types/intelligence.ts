/**
 * VELQOARATH — EXTENDED INTELLIGENCE TYPES
 *
 * Formalizes structured contracts for:
 * 1. Catalyst Intelligence & Reaction Lifecycle
 * 2. Structured Contradictions
 * 3. Structured Thesis & Invalidation Engine
 * 4. 3-Dimensional Confluence Assessment
 * 5. Opportunity States & Decision Rationales
 * 6. Data Quality, Provenance & Freshness
 */

export type CatalystLifecycleState =
  | 'UPCOMING'
  | 'IMMINENT'
  | 'REACTING'
  | 'RELEASED'
  | 'PASSED'
  | 'STALE'
  | 'UNAVAILABLE';

export type EventRiskLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type CatalystDirectionalBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'UNKNOWN';

export interface CatalystEvent {
  id: string;
  name: string;
  currency: string;
  country?: string;
  category: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  scheduledTime: string;
  publishedAt?: string | null;
  fetchedAt: string;
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  surprise: number | null;
  surprisePercentage?: number | null;
  unit: string;
  source: string;
  sourceUrl?: string;
  status: 'UPCOMING' | 'RELEASED' | 'CANCELLED';
  freshness: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';
  lifecycle: CatalystLifecycleState;
  timeToEventMinutes: number; // Positive if future, negative if past
  // Strict separation of dimensions:
  directionalEvidence: {
    bias: CatalystDirectionalBias;
    weight: number; // 0 to 10
    reason: string;
    isVerifiedInterpretation: boolean;
  };
  eventRisk: {
    level: EventRiskLevel;
    inVolatilityWindow: boolean;
    reason: string;
  };
  timingRelevance: {
    windowDescription: string;
    isImmediateWatch: boolean;
  };
}

export type ContradictionCategory =
  | 'MARKET_VS_FUNDAMENTAL'
  | 'FUNDAMENTAL_VS_EXPECTATION'
  | 'POLICY_VS_MARKET'
  | 'POLICY_VS_EXPECTATION'
  | 'CATALYST_VS_THESIS'
  | 'SESSION_VS_TIMING'
  | 'DATA_QUALITY'
  | 'OTHER';

export type ContradictionSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type ContradictionStatus = 'UNRESOLVED' | 'RESOLVED' | 'UNKNOWN';

export interface StructuredContradiction {
  id: string;
  pair: string;
  currency: string;
  category: ContradictionCategory;
  contradictionType: ContradictionCategory;
  sourceA: string;
  sourceB: string;
  statementA: string;
  statementB: string;
  conflictDescription: string;
  description: string;
  directionA: string;
  directionB: string;
  severity: ContradictionSeverity;
  directionalImpact: string;
  penaltyPoints: number;
  affectedComponents: string[];
  status: ContradictionStatus;
  detectedTimestamp: string;
  sourceTimestamps: {
    sourceA?: string | null;
    sourceB?: string | null;
  };
  provenance: string;
}

export type InvalidationCategory =
  | 'MARKET_STRENGTH'
  | 'MARKET_STRUCTURE'
  | 'FUNDAMENTAL'
  | 'EXPECTATION'
  | 'MONETARY_POLICY'
  | 'CATALYST'
  | 'CONTRADICTION'
  | 'DATA_QUALITY'
  | 'SESSION';

export type InvalidationEvaluationStatus =
  | 'VALID'
  | 'WEAKENED'
  | 'INVALIDATED'
  | 'UNABLE_TO_EVALUATE';

export interface StructuredInvalidationCondition {
  id: string;
  category: InvalidationCategory;
  description: string;
  requiredEvidence: string;
  currentValue: string;
  triggerCondition: string;
  triggered: boolean;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  timestamp: string;
  evaluationStatus: InvalidationEvaluationStatus;
}

export type ThesisStatus =
  | 'VALIDATED'
  | 'SUPPORTED'
  | 'TENTATIVE'
  | 'MIXED'
  | 'WEAKENED'
  | 'INVALIDATED'
  | 'INSUFFICIENT_DATA';

export interface StructuredThesis {
  pair: string;
  direction: 'BULLISH_BASE' | 'BEARISH_BASE' | 'NEUTRAL' | 'DATA_UNAVAILABLE';
  summary: string;
  supportingEvidence: string[];
  counterEvidence: string[];
  catalysts: CatalystEvent[];
  contradictions: StructuredContradiction[];
  assumptions: string[];
  invalidationConditions: StructuredInvalidationCondition[];
  dataGaps: string[];
  evidenceQuality: 'COMPLETE' | 'PARTIAL' | 'DEGRADED' | 'UNAVAILABLE';
  status: ThesisStatus;
  createdAt: string;
  calculatedAt: string;
  provenance: string[];
}

export type ProvenanceType =
  | 'LIVE_PROVIDER'
  | 'OFFICIAL_SOURCE'
  | 'BENCHMARK'
  | 'DERIVED'
  | 'ENGINE_ANALYSIS';

export type DataFreshnessState = 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';

export interface DataProvenanceRecord {
  source: string;
  sourceUrl?: string;
  provider: string;
  publishedAt?: string | null;
  observedAt?: string | null;
  fetchedAt: string;
  period?: string;
  dataType: string;
  status: string;
  freshness: DataFreshnessState;
  provenanceType: ProvenanceType;
}

export interface ThreeDimensionalConfluence {
  directionalEvidence: {
    score: number; // 0 - 65 points from market, fundamentals, policy, expectations
    maxScore: number;
    factors: {
      name: string;
      rawDelta: number | null;
      contribution: number;
      explanation: string;
    }[];
  };
  context: {
    score: number; // 0 - 20 points from session, liquidity, overlaps
    maxScore: number;
    factors: {
      name: string;
      contribution: number;
      explanation: string;
    }[];
  };
  riskAndUncertainty: {
    penaltyScore: number; // deductions from contradictions, binary events, data degradation
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
    factors: {
      name: string;
      deduction: number;
      explanation: string;
    }[];
  };
}

export type OpportunityState =
  | 'PRIMARY_WATCH'
  | 'SECONDARY_WATCH'
  | 'MONITOR'
  | 'WAIT'
  | 'INSUFFICIENT_DATA';

export interface StructuredOpportunity {
  pair: string;
  state: OpportunityState;
  opportunityClassification?: 'EXPANSION' | 'MEAN_REVERSION' | 'MONITOR_ONLY' | 'WAIT_FOR_CATALYST' | 'NO_SETUP' | 'DATA_DEFICIENT';
  directionalBias: 'BULLISH_BASE' | 'BEARISH_BASE' | 'NEUTRAL' | 'DATA_UNAVAILABLE';
  confluenceScore: number;
  directionalConfidence: string;
  whyThisPair: string;
  watchReason: string;
  watchFactors: string[];
  dataGaps?: string[];
  keyCatalysts?: CatalystEvent[];
  risks?: string[];
  invalidationRules?: string[];
  supportingFactors: string[];
  counterFactors: string[];
  currentRisks: string[];
  catalysts: CatalystEvent[];
  thesisState: ThesisStatus;
  invalidationState: InvalidationEvaluationStatus;
  dataQuality: 'COMPLETE' | 'PARTIAL' | 'DEGRADED' | 'UNAVAILABLE';
  freshness: DataFreshnessState;
  sessionRelevance: string;
  generatedAt: string;
}
