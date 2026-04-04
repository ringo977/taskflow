/**
 * Zod validation schemas for all DB-facing data.
 *
 * Strategy:
 *   - Every public write function (upsert*, update*) calls `validate(schema, data)`
 *     before touching Supabase.
 *   - Schemas are intentionally lenient on optional fields (nullable, defaults)
 *     to avoid breaking existing UI flows, but strict on types and maxlengths.
 *   - `validate()` returns the parsed (coerced) object, so downstream code
 *     benefits from defaults and trims.
 */
import { z } from 'zod'

// ── Primitives ─────────────────────────────────────────────────

/** Non-empty trimmed string with max length */
const str = (max = 255) => z.string().trim().min(1, 'Required').max(max)

/** Optional trimmed string — empty string coerces to undefined */
const optStr = (max = 5000) =>
  z.string().trim().max(max).optional().nullable()
    .transform(v => (v === '' ? null : v))

/** UUID-shaped string (loose: accepts any 36-char hyphenated hex) */
const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID',
)

/** ISO date string (YYYY-MM-DD), empty string, or null — coerces falsy to null */
const isoDate = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  z.literal(''),
  z.null(),
  z.undefined(),
]).transform(v => v || null)

const priority = z.enum(['high', 'medium', 'low']).catch('medium')

const visibility = z.enum(['all', 'team', 'private']).catch('all')

const orgRole = z.enum(['admin', 'manager', 'member', 'guest'])

const projectRole = z.enum(['admin', 'manager', 'member', 'viewer'])

const projectStatus = z.enum(['active', 'on_hold', 'completed', 'archived']).catch('active')

const statusLabel = z.enum(['on_track', 'at_risk', 'off_track']).catch('on_track')

const hexColor = z.string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB')
  .catch('#378ADD')

// ── Entity schemas ─────────────────────────────────────────────

export const TaskUpsertSchema = z.object({
  id:           z.string().min(1),
  title:        str(500),
  desc:         optStr(10_000),
  who:          z.union([z.string(), z.array(z.string())]).optional().nullable(),
  pri:          priority,
  startDate:    isoDate,
  due:          isoDate,
  done:         z.boolean().catch(false),
  milestoneId:  uuid.optional().nullable(),
  attachments:  z.array(z.any()).catch([]),
  tags:         z.array(z.string().max(100)).catch([]),
  activity:     z.array(z.any()).catch([]),
  position:     z.number().int().min(0).catch(0),
  customValues: z.record(z.any()).catch({}),
  visibility:   visibility,
  partnerId:      z.string().optional().nullable(),
  workpackageId:  uuid.optional().nullable(),
  pid:          z.string().min(1),
  sec:          z.string().optional().nullable(),
  subs:         z.array(z.object({
    id:   z.string().min(1),
    t:    str(500),
    done: z.boolean().catch(false),
  })).optional().nullable(),
  cmts:         z.array(z.object({
    id:   z.string().min(1),
    who:  z.string().max(200).optional().nullable(),
    txt:  str(10_000),
    d:    z.string().optional().nullable(),
  })).optional().nullable(),
}).passthrough()  // allow extra fields like createdAt

export const TaskPatchSchema = z.object({
  title:        str(500).optional(),
  desc:         optStr(10_000),
  who:          z.union([z.string(), z.array(z.string())]).optional().nullable(),
  pri:          priority.optional(),
  startDate:    isoDate,
  due:          isoDate,
  done:         z.boolean().optional(),
  milestoneId:  uuid.optional().nullable(),
  recurrence:   z.any().optional(),
  tags:         z.array(z.string().max(100)).optional(),
  activity:     z.array(z.any()).optional(),
  position:     z.number().int().min(0).optional(),
  customValues: z.record(z.any()).optional(),
  partnerId:      z.string().optional().nullable(),
  workpackageId:  uuid.optional().nullable(),
  visibility:   visibility.optional(),
  attachments:  z.array(z.any()).optional(),
  subs:         z.array(z.object({
    id:   z.string().min(1),
    t:    str(500),
    done: z.boolean().catch(false),
  })).optional().nullable(),
  cmts:         z.array(z.object({
    id:   z.string().min(1),
    who:  z.string().max(200).optional().nullable(),
    txt:  str(10_000),
    d:    z.string().optional().nullable(),
  })).optional().nullable(),
}).passthrough()

export const ProjectUpsertSchema = z.object({
  id:             z.string().min(1),
  name:           str(255),
  color:          hexColor,
  status:         projectStatus,
  statusLabel:    statusLabel,
  portfolio:      z.string().nullable().optional(),
  description:    optStr(5000),
  resources:      z.array(z.any()).catch([]),
  customFields:   z.array(z.any()).catch([]),
  taskTemplates:  z.array(z.any()).catch([]),
  visibility:     visibility,
  sectionAccess:  z.record(z.any()).catch({}),
  forms:          z.array(z.any()).catch([]),
  rules:          z.array(z.any()).catch([]),
  goals:          z.array(z.any()).catch([]),
  project_type:   z.enum(['standard', 'supervised']).catch('standard'),
  startDate:      isoDate,
  endDate:        isoDate,
}).passthrough()

export const PortfolioUpsertSchema = z.object({
  id:          z.string().min(1),
  name:        str(255),
  color:       hexColor,
  desc:        optStr(2000),
  status:      projectStatus,
}).passthrough()

// ── Supervision ───────────────────────────────────────────────

const deliverableStatus = z.enum([
  'draft', 'in_progress', 'internal_review', 'submitted', 'accepted', 'delayed',
]).catch('draft')

export const DeliverableUpsertSchema = z.object({
  id:                  uuid.optional(),
  code:                str(50),
  title:               str(255),
  description:         optStr(5000),
  owner:               optStr(255),
  dueDate:             isoDate,
  status:              deliverableStatus,
  linkedMilestoneRef:  z.string().optional().nullable(),
  notes:               optStr(5000),
}).passthrough()

const controlFrequency = z.enum(['weekly', 'monthly', 'custom']).catch('weekly')
const controlActionType = z.enum(['create_task', 'reminder_only']).catch('reminder_only')

export const RecurringControlUpsertSchema = z.object({
  id:               uuid.optional(),
  title:            str(255),
  description:      optStr(5000),
  frequency:        controlFrequency,
  customInterval:   z.number().int().min(1).optional().nullable(),
  nextDueDate:      isoDate,
  actionType:       controlActionType,
  templateTaskData: z.any().optional().nullable(),
  active:           z.boolean().catch(true),
}).passthrough()

const partnerType = z.enum(['team', 'partner', 'vendor', 'lab', 'department', 'client']).catch('partner')

export const PartnerUpsertSchema = z.object({
  id:            z.string().optional(),
  name:          str(255),
  type:          partnerType,
  contactName:   optStr(255),
  contactEmail:  optStr(255),
  notes:         optStr(5000),
  isActive:      z.boolean().catch(true),
}).passthrough()

const wpStatus = z.enum(['draft', 'active', 'review', 'complete', 'delayed']).catch('draft')

export const WorkpackageUpsertSchema = z.object({
  id:             uuid.optional(),
  projectId:      z.string().optional(),
  code:           str(50),
  name:           str(255),
  description:    optStr(5000),
  ownerUserId:    uuid.optional().nullable(),
  ownerPartnerId: z.string().optional().nullable(),
  startDate:      isoDate,
  dueDate:        isoDate,
  status:         wpStatus,
  position:       z.number().int().min(0).catch(0),
  isActive:       z.boolean().catch(true),
}).passthrough().refine(
  d => !(d.ownerUserId && d.ownerPartnerId),
  { message: 'WP can have at most one owner (user or partner, not both)' },
)

const msStatus = z.enum(['draft', 'pending', 'achieved', 'missed']).catch('draft')

export const MilestoneUpsertSchema = z.object({
  id:             uuid.optional(),
  projectId:      z.string().optional(),
  workpackageId:  uuid.optional().nullable(),
  code:           str(50),
  name:           str(255),
  description:    optStr(5000),               // means of verification
  ownerUserId:    uuid.optional().nullable(),  // FK auth.users
  ownerPartnerId: z.string().optional().nullable(), // FK partners
  targetDate:     isoDate,
  status:         msStatus,
  position:       z.number().int().min(0).catch(0),
  isActive:       z.boolean().catch(true),
}).passthrough().refine(
  d => !(d.ownerUserId && d.ownerPartnerId),
  { message: 'Milestone can have at most one owner (user or partner, not both)' },
)

export const SectionNameSchema = str(255)

export const OrgRoleSchema = orgRole

export const ProjectRoleSchema = projectRole

// ── Validation helper ──────────────────────────────────────────

/**
 * Parse `data` against `schema`. Returns the coerced/cleaned value.
 * Throws a readable error on validation failure.
 */
export function validate(schema, data) {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
  throw new Error(`Validation failed: ${issues}`)
}
