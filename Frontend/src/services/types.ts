/**
 * types.ts — Shared TypeScript types for API responses.
 * Conforms to Phase 2 & Phase 3 specifications.
 */

export interface MethodInfo {
  name: string;
  return_type: string;
  parameters: string[] | Array<{ name: string; type: string }>;
  visibility: string;
  is_static?: boolean;
  static?: boolean;
  throws: string[];
}

export interface ComplexityInfo {
  method_count: number;
  branch_count: number;
  constructor_count: number;
  field_count: number;
  line_count: number;
}

export interface MethodParamDetail {
  name: string;
  type: string;
}

export interface MethodDetail {
  name: string;
  visibility: string;
  static: boolean;
  return_type: string;
  parameters: MethodParamDetail[];
  throws: string[];
}

export interface ConstructorDetail {
  name: string;
  visibility: string;
  parameters: MethodParamDetail[];
  throws: string[];
}

export interface FieldDetail {
  name: string;
  type: string;
  visibility: string;
  static: boolean;
  final: boolean;
}

export interface ClassDetail {
  name: string;
  type: string; // class | interface | enum | record
  visibility: string;
  constructors: ConstructorDetail[];
  fields: FieldDetail[];
  methods: MethodDetail[];
}

export interface StatisticsDetail {
  class_count: number;
  method_count: number;
  constructor_count: number;
  field_count: number;
  branch_count: number;
  line_count: number;
}

export interface StructuredAnalysis {
  source_id: string;
  package_name: string;
  imports: string[];
  classes: ClassDetail[];
  statistics: StatisticsDetail;
  analysis_notes?: string[];
}

export interface Phase3AnalysisResponse {
  analysis_id: string;
  source_id: string;
  status: string;
  analysis: StructuredAnalysis;
  class_name?: string;
  package?: string | null;
  imports?: string[];
  methods?: MethodDetail[];
  constructors?: ConstructorDetail[];
  complexity?: StatisticsDetail;
  analysis_notes?: string[];
}

export interface JavaAnalysisResult {
  class_name: string;
  package: string | null;
  imports: string[];
  methods: MethodInfo[];
  constructors: MethodInfo[];
  complexity: ComplexityInfo;
  analysis_notes: string[];
  analysis?: StructuredAnalysis;
  analysis_id?: string;
}
