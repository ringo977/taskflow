/**
 * Organisation definitions.
 * Each org has its own isolated data namespace in localStorage (prefix: {id}_).
 * Future: add supabaseUrl + supabaseAnonKey per org for separate databases.
 */
export const INITIAL_ORGS = [
  {
    id: 'polimi',
    name: 'Politecnico di Milano',
    shortName: 'PoliMi',
    color: '#378ADD',
    description: 'MiMic Lab, EU projects, teaching',
    // supabaseUrl: '',
    // supabaseAnonKey: '',
  },
  {
    id: 'biomimx',
    name: 'BiomimX Srl',
    shortName: 'BiomimX',
    color: '#D85A30',
    description: 'EIC Accelerator, uBeat® product line, investors',
    // supabaseUrl: '',
    // supabaseAnonKey: '',
  },
]
