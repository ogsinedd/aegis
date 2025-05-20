// Типы данных для контейнеров
export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  created_at: string;
  uptime: number;
  restart_count: number;
}

export interface ContainerWithVulns extends Container {
  vulnerability_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  score: number;
}

// Типы данных для уязвимостей
export interface Vulnerability {
  id: string;
  container_id: string;
  cve_id: string;
  package_name: string;
  package_version: string;
  fixed_version?: string;
  cvss: number;
  severity: string;
  description?: string;
  details: Record<string, any>;
  score: number;
  impact_factor: number;
  exploit_probability: number;
  created_at: string;
  updated_at: string;
}

export interface VulnerabilityWithContainer extends Vulnerability {
  container_name: string;
  container_image: string;
}

// Типы для планов патчинга
export type PatchScenario = 'hot-patch' | 'rolling-update' | 'blue-green';

export interface PatchPlanParams {
  window?: number;
  container_id?: string[];
  max_items?: number;
}

export interface PatchPlan {
  id: string;
  container_id: string;
  vulnerability_id: string;
  scenario: PatchScenario;
  start_time: string;
  duration: number;
  priority: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PatchPlanWithDetails extends PatchPlan {
  container_name: string;
  container_image: string;
  vulnerability_cve: string;
  vulnerability_severity: string;
  vulnerability_score: number;
}

export interface PlanTask {
  container_id: string;
  container_name: string;
  vulnerability_id: string;
  score: number;
  severity: string;
  scenario: PatchScenario;
  start: string;
  duration: number;
}

export interface PlanResponse {
  tasks: PlanTask[];
  total_score: number;
  total_duration: number;
}

// Типы для хуков
export interface Hook {
  id: number;
  name: string;
  type: string; // on_detect, pre_patch, post_patch, on_failure, on_rollback
  script: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
} 
