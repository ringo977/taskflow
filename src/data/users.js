/**
 * Fallback team rosters when Supabase has no org_members / profiles yet.
 * With DB + migration 002, OrgUsersProvider loads org_members + public.profiles instead.
 */

export const USERS_BY_ORG = {
  polimi: [
    { id: 'u1', name: 'Marco', email: 'marco@mimic.it', role: 'admin', color: '#1D9E75' },
    { id: 'u2', name: 'Alice', email: 'alice@mimic.it', role: 'member', color: '#378ADD' },
    { id: 'u3', name: 'Beatrice', email: 'beatrice@mimic.it', role: 'member', color: '#D85A30' },
    { id: 'u4', name: 'Carlo', email: 'carlo@mimic.it', role: 'member', color: '#7F77DD' },
    { id: 'u5', name: 'Diana', email: 'diana@mimic.it', role: 'guest', color: '#639922' },
  ],
  biomimx: [
    { id: 'b1', name: 'Giulia', email: 'giulia@biomimx.com', role: 'admin', color: '#D85A30' },
    { id: 'b2', name: 'Luca', email: 'luca@biomimx.com', role: 'member', color: '#1D9E75' },
    { id: 'b3', name: 'Elena', email: 'elena@biomimx.com', role: 'member', color: '#378ADD' },
    { id: 'b4', name: 'Francesco', email: 'francesco@biomimx.com', role: 'member', color: '#7F77DD' },
    { id: 'b5', name: 'Sara', email: 'sara@biomimx.com', role: 'guest', color: '#EF9F27' },
  ],
}

export function getUsersForOrg(orgId) {
  return USERS_BY_ORG[orgId] ?? USERS_BY_ORG.polimi
}

export function getMemberNamesForOrg(orgId) {
  return getUsersForOrg(orgId).map(u => u.name)
}

/** @deprecated Use getUsersForOrg / useOrgUsers */
export const USERS = USERS_BY_ORG.polimi

/** @deprecated Use getMemberNamesForOrg(activeOrgId) */
export const MEMBERS_LIST = USERS_BY_ORG.polimi.map(u => u.name)

export const DEMO_PASSWORD = 'mimic2026'
