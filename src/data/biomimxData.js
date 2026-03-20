/**
 * Seed data for BiomimX org.
 * Separate from polimi (INITIAL_*) data in initialData.js.
 */
export const BIOMIMX_PROJECTS = [
  { id:'bp1', name:'EIC Accelerator (CUORE)', color:'#D85A30', members:['Giulia','Elena'], status:'active', portfolio:'bpo1', statusLabel:'at_risk', description:'€10M EIC Accelerator round. Finalising pitch deck, abstract and due diligence package.' },
  { id:'bp2', name:'uHeart®',                 color:'#1D9E75', members:['Giulia','Luca'],    status:'active', portfolio:'bpo2', statusLabel:'on_track', description:'Cardiac organ-on-chip device. TRL 6 — validation ongoing with hospital partners.' },
  { id:'bp3', name:'uKnee®',                  color:'#7F77DD', members:['Giulia','Francesco'],    status:'active', portfolio:'bpo2', statusLabel:'on_track', description:'Knee joint-on-chip for osteoarthritis drug testing. Pre-commercial stage.' },
  { id:'bp4', name:'Investor Relations',       color:'#EF9F27', members:['Giulia','Elena'], status:'active', portfolio:'bpo1', statusLabel:'on_track', description:'Seed round management, investor teaser, cap table, term sheet negotiations.' },
]

export const BIOMIMX_PORTFOLIOS = [
  { id:'bpo1', name:'Fundraising',   color:'#EF9F27', desc:'EIC, seed round, investor pipeline' },
  { id:'bpo2', name:'Product Line',  color:'#1D9E75', desc:'uBeat® devices development' },
]

export const BIOMIMX_SECTIONS = {
  bp1: ['To Do', 'In Progress', 'Review', 'Done'],
  bp2: ['Backlog', 'Development', 'Validation', 'Done'],
  bp3: ['Backlog', 'Development', 'Validation', 'Done'],
  bp4: ['To Do', 'In Progress', 'Done'],
}

export const BIOMIMX_TASKS = [
  { id:'bt1',  pid:'bp1', title:'Fix false negative framing in abstract', sec:'Done',        who:'Giulia',    startDate:'2026-03-10', due:'2026-03-15', pri:'high',   desc:'Scientific accuracy issue: correct false negative vs false positive in diagnostic claim.', subs:[], cmts:[], done:true },
  { id:'bt2',  pid:'bp1', title:'TRL progression language review',        sec:'Done',        who:'Giulia',    startDate:'2026-03-12', due:'2026-03-17', pri:'high',   desc:'Ensure TRL 5→6→7 narrative is consistent throughout the application.', subs:[], cmts:[], done:true },
  { id:'bt3',  pid:'bp1', title:'EU health mission alignment',            sec:'In Progress', who:'Elena', startDate:'2026-03-18', due:'2026-03-24', pri:'high',   desc:'Align abstract with EU Cancer Mission and cardiovascular health targets.', subs:[{id:'bs1',t:'Map to EU4Health priorities',done:true},{id:'bs2',t:'Add SDG references',done:false}], cmts:[], done:false },
  { id:'bt4',  pid:'bp1', title:'Financial projections 5-year model',     sec:'In Progress', who:'Elena', startDate:'2026-03-19', due:'2026-03-28', pri:'high',   desc:'Build detailed 5-year P&L model for EIC panel.', subs:[], cmts:[], done:false },
  { id:'bt5',  pid:'bp1', title:'Submit EIC application portal',          sec:'To Do',       who:'Giulia',    startDate:'2026-04-01', due:'2026-04-15', pri:'high',   desc:'Final submission through EIC portal after consortium review.', subs:[], cmts:[], done:false },
  { id:'bt6',  pid:'bp4', title:'Investor teaser v3',                     sec:'In Progress', who:'Elena', startDate:'2026-03-20', due:'2026-03-30', pri:'medium', desc:'One-pager with updated valuation, exit strategy, and competitive landscape.', subs:[], cmts:[], done:false },
  { id:'bt7',  pid:'bp4', title:'Cap table clean-up',                     sec:'To Do',       who:'Giulia',    startDate:'2026-03-25', due:'2026-04-05', pri:'medium', desc:'Resolve option pool allocation before seed round term sheet.', subs:[], cmts:[], done:false },
  { id:'bt8',  pid:'bp4', title:'ERC PoC BATTITO review',                 sec:'Done',        who:'Giulia',    startDate:'2026-03-05', due:'2026-03-10', pri:'low',    desc:'Review closed-loop cardiac organoid-on-chip ERC PoC proposal.', subs:[], cmts:[], done:true },
  { id:'bt9',  pid:'bp2', title:'Hospital validation protocol v2',        sec:'Validation',  who:'Luca',    startDate:'2026-03-15', due:'2026-04-01', pri:'high',   desc:'Second validation round with Ospedale Niguarda cardiac team.', subs:[{id:'bs3',t:'Define endpoints',done:true},{id:'bs4',t:'IRB submission',done:false}], cmts:[], done:false },
  { id:'bt10', pid:'bp2', title:'CE marking pre-assessment',              sec:'Backlog',     who:'Giulia',    startDate:'2026-04-05', due:'2026-04-30', pri:'medium', desc:'Notified body pre-assessment for Class II medical device classification.', subs:[], cmts:[], done:false },
  { id:'bt11', pid:'bp3', title:'Osteoarthritis drug panel testing',       sec:'Development', who:'Francesco',    startDate:'2026-03-20', due:'2026-04-10', pri:'medium', desc:'Test 5 candidate compounds on uKnee platform with synovial fluid model.', subs:[], cmts:[], done:false },
]
