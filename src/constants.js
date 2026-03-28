import { storage } from '@/utils/storage'
import { PROJECT_COLORS, INITIAL_PROJECTS, INITIAL_PORTFOLIOS, INITIAL_SECTIONS, INITIAL_TASKS } from '@/data/initialData'
import { BIOMIMX_PROJECTS, BIOMIMX_PORTFOLIOS, BIOMIMX_SECTIONS, BIOMIMX_TASKS } from '@/data/biomimxData'

export const EMPTY_FILTERS = { q: '', pri: 'all', who: 'all', due: 'all', done: 'all', tag: 'all' }

export const PROJECT_TEMPLATES = [
  {
    id: 'kanban', name: 'Kanban', icon: '📋',
    description: 'Simple Kanban board with standard workflow columns.',
    sections: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
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
    tasks: [
      { title: 'Literature search & review', sec: 'Literature Review', pri: 'high', desc: 'Systematic search of relevant papers and prior art.' },
      { title: 'Define research questions', sec: 'Literature Review', pri: 'high' },
      { title: 'Design experimental protocol', sec: 'Experiment Design', pri: 'medium' },
      { title: 'Prepare materials & equipment', sec: 'Experiment Design', pri: 'medium' },
      { title: 'Draft manuscript outline', sec: 'Writing', pri: 'low' },
    ],
  },
  {
    id: 'launch', name: 'Product Launch', icon: '🚀',
    description: 'Go-to-market checklist for product or feature launches.',
    sections: ['Planning', 'Development', 'Marketing', 'Launch', 'Post-launch'],
    tasks: [
      { title: 'Define launch goals & KPIs', sec: 'Planning', pri: 'high' },
      { title: 'Finalize feature set', sec: 'Development', pri: 'high' },
      { title: 'Prepare marketing assets', sec: 'Marketing', pri: 'medium' },
      { title: 'Write announcement blog post', sec: 'Marketing', pri: 'medium' },
      { title: 'Go/no-go review', sec: 'Launch', pri: 'high' },
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
