import { storage } from '@/utils/storage'
// eslint-disable-next-line no-unused-vars
import { PROJECT_COLORS, INITIAL_PROJECTS, INITIAL_PORTFOLIOS, INITIAL_SECTIONS, INITIAL_TASKS } from '@/data/initialData'
import { BIOMIMX_PROJECTS, BIOMIMX_PORTFOLIOS, BIOMIMX_SECTIONS, BIOMIMX_TASKS } from '@/data/biomimxData'

export const EMPTY_FILTERS = { q: '', pri: 'all', who: 'all', due: 'all', done: 'all', tag: 'all', ms: 'all' }

export const PROJECT_TEMPLATES = [
  {
    id: 'kanban', name: 'Kanban', icon: '📋',
    description: 'Simple Kanban board with standard workflow columns.',
    sections: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
    customFields: [
      { id: 'cf_effort', name: 'Effort', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL'] },
    ],
    rules: [
      { id: 'r_done', name: 'Auto-complete on Done', trigger: 'section_change', triggerConfig: { toSection: 'Done' }, action: 'complete_task', actionConfig: {}, enabled: true },
    ],
    tasks: [
      { title: 'Define project scope', sec: 'To Do', pri: 'high', desc: 'Outline goals, deliverables, and key milestones.' },
      { title: 'Set up team communication', sec: 'To Do', pri: 'medium' },
      { title: 'Create initial backlog', sec: 'Backlog', pri: 'medium' },
    ],
  },
  {
    id: 'sprint', name: 'Sprint', icon: '🏃',
    description: 'Two-week sprint cycle with planning and review phases.',
    sections: ['Sprint Backlog', 'In Progress', 'Testing', 'Done'],
    customFields: [
      { id: 'cf_points', name: 'Story Points', type: 'number' },
      { id: 'cf_type', name: 'Type', type: 'select', options: ['Feature', 'Bug', 'Chore', 'Spike'] },
    ],
    rules: [
      { id: 'r_done', name: 'Auto-complete on Done', trigger: 'section_change', triggerConfig: { toSection: 'Done' }, action: 'complete_task', actionConfig: {}, enabled: true },
      { id: 'r_deadline', name: 'Deadline alert', trigger: 'deadline_approaching', triggerConfig: { days: 1 }, action: 'notify', actionConfig: { message: 'Task "{task}" is due tomorrow!' }, enabled: false },  // V1.5: time-based trigger, needs scheduler
    ],
    goals: [
      { id: 'g_sprint', name: 'Sprint completion', subGoals: [], linkedTaskIds: [] },
    ],
    tasks: [
      { title: 'Sprint planning meeting', sec: 'Sprint Backlog', pri: 'high' },
      { title: 'Define acceptance criteria', sec: 'Sprint Backlog', pri: 'high' },
      { title: 'Sprint retrospective', sec: 'Sprint Backlog', pri: 'medium' },
    ],
  },
  {
    id: 'research', name: 'Research', icon: '🔬',
    description: 'Research project with literature review, experiments, and publication.',
    sections: ['Literature Review', 'Experiment Design', 'Data Collection', 'Analysis', 'Writing'],
    customFields: [
      { id: 'cf_category', name: 'Category', type: 'select', options: ['Theory', 'Experiment', 'Data', 'Writing'] },
      { id: 'cf_reviewer', name: 'Reviewer', type: 'text' },
    ],
    forms: [
      {
        id: 'f_experiment', name: 'New Experiment', description: 'Submit a new experiment request',
        defaultSection: 'Experiment Design',
        fields: [
          { id: 'f1', label: 'Experiment title', type: 'text', mapsTo: 'title', required: true },
          { id: 'f2', label: 'Hypothesis', type: 'textarea', mapsTo: 'desc', required: true },
          { id: 'f3', label: 'Priority', type: 'select', mapsTo: 'pri', options: 'low,medium,high', required: false },
        ],
      },
    ],
    goals: [
      { id: 'g_lit', name: 'Literature review complete', subGoals: [], linkedTaskIds: [] },
      { id: 'g_pub', name: 'Paper submitted', subGoals: [], linkedTaskIds: [] },
    ],
    workpackages: [
      { code: 'WP1', name: 'Literature Review', status: 'active', description: 'Systematic review of prior art and state of the art.' },
      { code: 'WP2', name: 'Experimentation', status: 'draft', description: 'Design, execution, and data collection of experiments.' },
      { code: 'WP3', name: 'Analysis & Writing', status: 'draft', description: 'Data analysis, interpretation, and manuscript preparation.' },
    ],
    milestones: [
      { code: 'MS1', name: 'Literature review complete', status: 'pending', wpCode: 'WP1', description: 'All relevant papers reviewed and gaps identified.' },
      { code: 'MS2', name: 'Data collection complete', status: 'draft', wpCode: 'WP2', description: 'All planned experiments executed, raw data available.' },
      { code: 'MS3', name: 'Paper submitted', status: 'draft', wpCode: 'WP3', description: 'Manuscript submitted to target journal/conference.' },
    ],
    partnerSuggestions: [
      { name: 'External Lab', type: 'lab', roleLabel: 'Collaboration partner' },
    ],
    rules: [
      { id: 'r_ms_lit', name: 'Auto-achieve MS1 on completion', trigger: 'all_tasks_done_in_ms', triggerConfig: { msCode: 'MS1' }, action: 'set_ms_status', actionConfig: { toStatus: 'achieved' }, enabled: true },
    ],
    tasks: [
      { title: 'Literature search & review', sec: 'Literature Review', pri: 'high', desc: 'Systematic search of relevant papers and prior art.', wpCode: 'WP1', msCode: 'MS1' },
      { title: 'Define research questions', sec: 'Literature Review', pri: 'high', wpCode: 'WP1', msCode: 'MS1' },
      { title: 'Design experimental protocol', sec: 'Experiment Design', pri: 'medium', wpCode: 'WP2' },
      { title: 'Prepare materials & equipment', sec: 'Experiment Design', pri: 'medium', wpCode: 'WP2', msCode: 'MS2' },
      { title: 'Draft manuscript outline', sec: 'Writing', pri: 'low', wpCode: 'WP3' },
    ],
  },
  {
    id: 'launch', name: 'Product Launch', icon: '🚀',
    description: 'Go-to-market checklist for product or feature launches.',
    sections: ['Planning', 'Development', 'Marketing', 'Launch', 'Post-launch'],
    customFields: [
      { id: 'cf_owner', name: 'Workstream Owner', type: 'text' },
      { id: 'cf_channel', name: 'Channel', type: 'select', options: ['Web', 'Mobile', 'Email', 'Social', 'PR'] },
    ],
    workpackages: [
      { code: 'WP1', name: 'Planning & Strategy', status: 'active', description: 'Goals, KPIs, and go-to-market strategy definition.' },
      { code: 'WP2', name: 'Product Development', status: 'draft', description: 'Feature development and QA before launch.' },
      { code: 'WP3', name: 'Marketing & Comms', status: 'draft', description: 'Marketing assets, blog posts, and PR.' },
    ],
    milestones: [
      { code: 'MS1', name: 'Feature freeze', status: 'pending', wpCode: 'WP2', description: 'All launch features finalized and QA-approved.' },
      { code: 'MS2', name: 'Go/no-go decision', status: 'draft', wpCode: 'WP1', description: 'Formal launch readiness review passed.' },
      { code: 'MS3', name: 'Launch day', status: 'draft', description: 'Product publicly available.' },
    ],
    partnerSuggestions: [
      { name: 'PR Agency', type: 'vendor', roleLabel: 'Press & communications' },
    ],
    rules: [
      { id: 'r_launch_pri', name: 'Launch items high priority', trigger: 'section_change', triggerConfig: { toSection: 'Launch' }, action: 'set_priority', actionConfig: { priority: 'high' }, enabled: true },
      { id: 'r_wp_dev', name: 'Auto-complete WP2 on task completion', trigger: 'all_tasks_done_in_wp', triggerConfig: { wpCode: 'WP2' }, action: 'set_wp_status', actionConfig: { status: 'complete' }, enabled: true },
    ],
    goals: [
      { id: 'g_launch', name: 'Launch readiness', subGoals: [
        { id: 'sg_dev', name: 'Development complete', linkedTaskIds: [] },
        { id: 'sg_mkt', name: 'Marketing ready', linkedTaskIds: [] },
      ], linkedTaskIds: [] },
    ],
    tasks: [
      { title: 'Define launch goals & KPIs', sec: 'Planning', pri: 'high', wpCode: 'WP1' },
      { title: 'Finalize feature set', sec: 'Development', pri: 'high', wpCode: 'WP2', msCode: 'MS1' },
      { title: 'Prepare marketing assets', sec: 'Marketing', pri: 'medium', wpCode: 'WP3' },
      { title: 'Write announcement blog post', sec: 'Marketing', pri: 'medium', wpCode: 'WP3' },
      { title: 'Go/no-go review', sec: 'Launch', pri: 'high', wpCode: 'WP1', msCode: 'MS2' },
      { title: 'Collect user feedback', sec: 'Post-launch', pri: 'medium' },
    ],
  },
]

export const ORG_SEEDS = {
  polimi:  { projs: INITIAL_PROJECTS,  ports: INITIAL_PORTFOLIOS,  secs: INITIAL_SECTIONS,  tasks: INITIAL_TASKS },
  biomimx: { projs: BIOMIMX_PROJECTS,  ports: BIOMIMX_PORTFOLIOS,  secs: BIOMIMX_SECTIONS,  tasks: BIOMIMX_TASKS },
  _empty:  { projs: [],                ports: [],                  secs: {},                tasks: [] },
}

export const seedFor = (orgId) => ORG_SEEDS[orgId] ?? ORG_SEEDS._empty

export const oget = (orgId, key, fb) => storage.get(`${orgId}_${key}`, fb)
export const oset = (orgId, key, val) => storage.set(`${orgId}_${key}`, val)
