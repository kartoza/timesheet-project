export const UI_PROJECT_KEYS = {
  PROJECT: 'Project',
  PROJECT_TYPE: 'Project Type',
  RELATIONSHIP_MANAGER: 'Relationship Manager',
  PROJECT_MANAGER: 'Project Manager',
  TEAM_MEMBERS: 'Team Members',
  DUE_DATE: 'Due Date',
  START_DATE: 'Start Date',
  STATUS: 'Status',
  BUDGET_HOURS: 'Budget (Hours)',
  CONSUMED_TIME: 'Consumed Time',
  TOTAL_COSTING: 'Total Costing',
  TOTAL_SALES_AMOUNT: 'Total Sales Amount (via Sales Order)',
  ACTUAL_PROGRESS: 'Actual Progress',
  BUSINESS_UNIT: 'Business Unit',
  SUBTASKS: 'SubTasks',
} as const;

export const API_STATUS_TO_UI_STATUS: Record<string, string> = {
  on_track: '🟢 On track',
  delayed: '🟡 Delayed',
  at_risk: '🔴 At risk',
  completed: '🟣 Completed',
};

export const UI_STATUS_TO_BACKEND: Record<string, { rag?: string; is_active?: boolean }> = {
  '🟣 completed': { is_active: false },
  completed: { is_active: false },
  '🔴 at risk': { is_active: true, rag: 'RED' },
  'at risk': { is_active: true, rag: 'RED' },
  '🟡 delayed': { is_active: true, rag: 'AMBER' },
  delayed: { is_active: true, rag: 'AMBER' },
  '🟡 warning': { is_active: true, rag: 'AMBER' },
  warning: { is_active: true, rag: 'AMBER' },
  '🟢 on track': { is_active: true, rag: 'GREEN' },
  'on track': { is_active: true, rag: 'GREEN' },
};

export const UI_TO_BACKEND_FIELD_MAP: Record<string, string> = {
  [UI_PROJECT_KEYS.PROJECT]: 'name',
  [UI_PROJECT_KEYS.RELATIONSHIP_MANAGER]: 'relations_manager_name',
  [UI_PROJECT_KEYS.PROJECT_MANAGER]: 'project_manager_name',
  [UI_PROJECT_KEYS.DUE_DATE]: 'due_date',
  [UI_PROJECT_KEYS.BUDGET_HOURS]: 'budget_hours',
  [UI_PROJECT_KEYS.CONSUMED_TIME]: 'consumed_time',
  [UI_PROJECT_KEYS.TOTAL_COSTING]: 'total_costing',
  [UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT]: 'total_sales_amount',
  [UI_PROJECT_KEYS.ACTUAL_PROGRESS]: 'actual_progress',
};

export const NUMERIC_UI_FIELDS = new Set<string>([
  UI_PROJECT_KEYS.BUDGET_HOURS,
  UI_PROJECT_KEYS.CONSUMED_TIME,
  UI_PROJECT_KEYS.TOTAL_COSTING,
  UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT,
  UI_PROJECT_KEYS.ACTUAL_PROGRESS,
]);
