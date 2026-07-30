export type Confidence = 'low' | 'medium' | 'high';
export type ClinicalClueCategory =
  | 'hemodynamics' | 'ecg' | 'airway' | 'ventilation' | 'oxygenation'
  | 'gas-analysis' | 'skin' | 'laboratory' | 'ultrasound' | 'equipment'
  | 'monitoring-reliability' | 'surgical';

export interface ClinicalClue {
  id: string;
  category: ClinicalClueCategory;
  value: string | number | boolean;
  confidence: Confidence;
  meaning?: string;
  supports?: Array<{ diagnosisId: string; weight: number }>;
  against?: Array<{ diagnosisId: string; weight: number }>;
  nextAction?: string;
  observedAt: string;
}

export interface PatientProfile {
  ageYears?: number;
  sex?: 'female' | 'male' | 'other' | 'unknown';
  weightKg?: number;
  allergies?: string[];
  comorbidities?: string[];
  previousPerioperativeEvents?: string[];
}

export interface ProcedureContext {
  procedure?: string;
  phase?: 'preoperative' | 'induction' | 'maintenance' | 'emergence' | 'postoperative';
  anesthesiaTechnique?: string[];
  position?: string;
  recentEvents?: string[];
}

export interface ReasoningCandidate {
  diagnosisId: string;
  label: string;
  score: number;
  confidence: number;
  supportingClues: string[];
  opposingClues: string[];
}

export interface ActionResponseEvent {
  id: string;
  time: string;
  action: string;
  response?: 'improved' | 'partial' | 'none' | 'unknown';
}

export interface ClinicalCase {
  id: string;
  createdAt: string;
  patientProfile: PatientProfile;
  procedureContext: ProcedureContext;
  clues: ClinicalClue[];
  reasoning: ReasoningCandidate[];
  timeline: ActionResponseEvent[];
}
