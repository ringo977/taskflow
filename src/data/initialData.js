export const PROJECT_COLORS = [
  '#1D9E75','#378ADD','#D85A30','#7F77DD',
  '#639922','#EF9F27','#BA7517','#D4537E',
]

export const INITIAL_PROJECTS = [
  { id:'p1', name:'MiMic Lab',  color:'#1D9E75', members:['Marco','Alice','Beatrice'], status:'active', portfolio:'po1', statusLabel:'on_track', description:'Internal lab management, teaching materials, and equipment for MiMic Lab at DEIB, Politecnico di Milano.' },
  { id:'p2', name:'PHOENIX',    color:'#378ADD', members:['Marco','Carlo'],            status:'active', portfolio:'po2', statusLabel:'at_risk',  description:'EU-funded project on organ-on-chip platforms for neuromuscular disease modelling. H2020 consortium.' },
  { id:'p3', name:'BiomimX',    color:'#D85A30', members:['Marco','Beatrice'],         status:'active', portfolio:'po2', statusLabel:'on_track', description:'EIC Accelerator spinoff developing the uBeat® product line for organs-on-chip commercial applications.' },
  { id:'p4', name:'BuonMarrow', color:'#7F77DD', members:['Marco','Alice','Carlo'],    status:'active', portfolio:'po2', statusLabel:'on_track', description:'EU project on bone marrow-on-chip for haematological disease modelling and drug testing.' },
]

export const INITIAL_PORTFOLIOS = [
  { id:'po1', name:'Lab Operations', color:'#1D9E75', desc:'Internal MiMic Lab activities' },
  { id:'po2', name:'EU Projects',    color:'#378ADD', desc:'PHOENIX, BuonMarrow and spinoff' },
]

export const INITIAL_SECTIONS = {
  p1:['Backlog','In Progress','Review','Done'],
  p2:['To Do','In Progress','Done'],
  p3:['Backlog','Active','Done'],
  p4:['To Do','In Progress','Done'],
}

export const INITIAL_TASKS = [
  { id:'t1',  pid:'p1', title:'Update MiMic Lab homepage',        sec:'In Progress', who:'Marco',    startDate:'2026-03-18', due:'2026-03-25', pri:'medium', desc:'Update homepage with recent publications and new team members.',                                    subs:[{id:'s1',t:'Update publications list',done:true},{id:'s2',t:'Add team members',done:false}], cmts:[], done:false },
  { id:'t2',  pid:'p1', title:'Prepare Lecture 06 slides',        sec:'Backlog',     who:'Marco',    startDate:'2026-03-24', due:'2026-03-28', pri:'high',   desc:'Bioartificial systems – lecture on organ-on-chip integration and scaling laws.',                   subs:[], cmts:[], done:false },
  { id:'t3',  pid:'p1', title:'Mamba controller testing',         sec:'Review',      who:'Alice',    startDate:'2026-03-14', due:'2026-03-20', pri:'medium', desc:'Test tick-based timing architecture for pneumatic solenoid valve stimulation.',                   subs:[{id:'s3',t:'Write test protocol',done:true},{id:'s4',t:'Run bench tests',done:true},{id:'s5',t:'Document results',done:false}], cmts:[{id:'c1',who:'Marco',txt:'Initial tests look good',d:'2026-03-14'}], done:false },
  { id:'t4',  pid:'p2', title:'WP4→WP5 task reallocation',        sec:'In Progress', who:'Marco',    startDate:'2026-03-17', due:'2026-03-22', pri:'high',   desc:'Formal request to PO Kadu for reallocation, NMI deviation on 3D electrodes.',                   subs:[{id:'s6',t:'Draft formal letter',done:true},{id:'s7',t:'Consortium approval',done:false},{id:'s8',t:'Submit to EC portal',done:false}], cmts:[], done:false },
  { id:'t5',  pid:'p2', title:'uNMC MEA electrode layout',        sec:'Done',        who:'Marco',    startDate:'2026-03-10', due:'2026-03-15', pri:'medium', desc:'Finalise MCS software XML layout file for microNeuromuscular Chip.',                             subs:[], cmts:[{id:'c2',who:'Marco',txt:'Layout validated with MEA specialists',d:'2026-03-13'}], done:true },
  { id:'t6',  pid:'p2', title:'D2.3 deliverable review',          sec:'To Do',       who:'Marco',    startDate:'2026-03-25', due:'2026-04-01', pri:'high',   desc:'Review gaps: missing IL-1β qPCR, ATP measurements, incomplete patient sample validation.',       subs:[], cmts:[], done:false },
  { id:'t7',  pid:'p3', title:'EIC Accelerator abstract (CUORE)', sec:'Active',      who:'Marco',    startDate:'2026-03-15', due:'2026-03-20', pri:'high',   desc:'Finalise abstract with correct scientific framing and EU policy alignment for €10M round.',      subs:[{id:'s9',t:'Fix false positive/negative framing',done:true},{id:'s10',t:'TRL progression language',done:true},{id:'s11',t:'Align with EU health mission',done:false}], cmts:[], done:false },
  { id:'t8',  pid:'p3', title:'Investor teaser deck',             sec:'Active',      who:'Beatrice', startDate:'2026-03-20', due:'2026-03-30', pri:'medium', desc:'One-pager teaser for the €10M round with valuation and exit strategy.',                         subs:[], cmts:[], deps:['t7'], done:false },
  { id:'t9',  pid:'p3', title:'ERC PoC BATTITO review',           sec:'Done',        who:'Marco',    startDate:'2026-03-05', due:'2026-03-10', pri:'low',    desc:'Review closed-loop cardiac organoid-on-chip proposal.',                                         subs:[], cmts:[], done:true },
  { id:'t10', pid:'p4', title:'D2.3 INT team feedback',           sec:'In Progress', who:'Marco',    startDate:'2026-03-19', due:'2026-03-24', pri:'high',   desc:'Send structured feedback to INT team on D2.3 gaps vs Grant Agreement.',                        subs:[{id:'s12',t:'Review deliverable',done:true},{id:'s13',t:'Draft feedback document',done:true},{id:'s14',t:'Send to INT team',done:false}], cmts:[], done:false },
  { id:'t11', pid:'p1', title:'uBox-4 Qt6/QML chart rendering',   sec:'Backlog',     who:'Alice',    startDate:'2026-03-28', due:'2026-04-05', pri:'medium', desc:'Optimise chart rendering in QML for uBox-4 Raspberry Pi CM5.',                                 subs:[], cmts:[], deps:['t3'], done:false },
  { id:'t12', pid:'p2', title:'NMI deviation formal response',    sec:'To Do',       who:'Marco',    startDate:'2026-03-20', due:'2026-03-26', pri:'high',   desc:'Formal response to NMI deviation on 3D electrodes in WP4.',                                    subs:[], cmts:[], deps:['t4'], done:false },
  { id:'t13', pid:'p4', title:'IL-1β qPCR protocol',             sec:'To Do',       who:'Beatrice', startDate:'2026-03-28', due:'2026-04-10', pri:'medium', desc:'Define and validate qPCR protocol for IL-1β missing from D2.3.',                               subs:[], cmts:[], deps:['t10'], done:false },
]
