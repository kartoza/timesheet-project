import { ReactNode } from 'react';
import { UI_PROJECT_KEYS } from '../constants/pmo_dashboard';

type UIKeyValue = typeof UI_PROJECT_KEYS[keyof typeof UI_PROJECT_KEYS];

export type TeamMember = {
  id: number;
  name: string;
  role: string;
  is_lead: boolean;
};

export type Subtask = {
  id: number;
  name: string;
  budget_time: number | null;
  consumed_time: number | null;
  billable_hours: number | null;
};

export type ApiProject = {
  id: number;
  name: string;
  project_type?: string | null;
  status: string;
  status_label?: string | null;
  status_reasons?: string[];
  rag: string | null;
  business_unit: string | null;
  due_date: string | null;
  start_date?: string | null;
  budget_hours: number | null;
  consumed_time: number | null;
  total_costing: number | null;
  total_sales_amount: number | null;
  total_billed_amount: number | null;
  relations_manager: string | null;
  project_manager: string | null;
  actual_progress: number | null;
  team_members?: TeamMember[];
  subtasks?: Subtask[];
  last_synced_at?: string | null;
};

export type UISubTask = {
  id: number;
  name: string;
  budgetTime: number;
  consumedTime: number;
  billableHours: number;
};

export type RiskReason = {
  type: string;
  text: string;
  icon?: ReactNode;
};

export type UIProjectRow = {
  _id: string;
  [UI_PROJECT_KEYS.PROJECT]: string;
  [UI_PROJECT_KEYS.PROJECT_TYPE]: string;
  [UI_PROJECT_KEYS.RELATIONSHIP_MANAGER]: string;
  [UI_PROJECT_KEYS.PROJECT_MANAGER]: string;
  [UI_PROJECT_KEYS.TEAM_MEMBERS]: string[];
  [UI_PROJECT_KEYS.DUE_DATE]: string;
  [UI_PROJECT_KEYS.START_DATE]: string;
  [UI_PROJECT_KEYS.STATUS]: string;
  [UI_PROJECT_KEYS.BUDGET_HOURS]: number;
  [UI_PROJECT_KEYS.CONSUMED_TIME]: number;
  [UI_PROJECT_KEYS.TOTAL_COSTING]: number;
  [UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT]: number;
  [UI_PROJECT_KEYS.TOTAL_BILLED_AMOUNT]: number;
  [UI_PROJECT_KEYS.ACTUAL_PROGRESS]: number;
  [UI_PROJECT_KEYS.BUSINESS_UNIT]: string;
  [UI_PROJECT_KEYS.SUBTASKS]: UISubTask[];
  _statusKey?: string;
  _statusReasons?: string[];
  _riskReason?: RiskReason[];
  _lastSyncedAt?: string | null;
};

export type UIProjectKey = UIKeyValue;

export type LoginResponse = {
  success: boolean;
  user: SessionUser;
};

export type SessionUser = {
  id?: number;
  email?: string;
  username?: string;
  full_name?: string;
  role?: string;
};

export type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

export type CreateProjectPayload = {
  Project: string;
  'Relationship Manager': string;
  'Due Date': string;
  Status: string;
  'Budget (Hours)': number;
  'Consumed Time': number;
  'Total Sales Amount (via Sales Order)': number;
  'Total Costing': number;
  'Total Billed Amount'?: number;
  'Actual Progress': number;
};
