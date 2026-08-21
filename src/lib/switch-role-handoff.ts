/**
 * Hand-off between the "Switch Account Type" modal and `/dashboard/switch-role`.
 *
 * `POST /auth/switch-role` is the ONLY place the missing-field list comes from —
 * there is no separate "fields for role X" endpoint. It arrives on the HTTP 400
 * "profile not completed" rejection, so whatever that one response carried has to
 * travel with the navigation instead of being refetched: re-POSTing switch-role
 * just to redraw the form would only fail the same way again.
 *
 * It goes through sessionStorage rather than component state so a refresh of the
 * form page keeps working, and it's scoped to the tab + wiped once the switch is
 * finished. Anything older than TTL_MS is treated as absent — a stale hand-off
 * from an abandoned attempt must never silently reappear.
 */
import type { Role } from "@/lib/roles";
import type { SwitchRoleFieldMeta } from "@/types/api.types";
import type { SwitchRoleField } from "@/services/user.service";

const STORAGE_KEY = "bridge-platform.switch-role";
const TTL_MS = 15 * 60_000;

export interface SwitchRoleHandoff {
  /** The role the user is trying to move into. */
  role: Role;
  /** The required columns that role has no value for yet. */
  fields: SwitchRoleFieldMeta[];
  /** Backend message worth echoing on the form (e.g. "Profile not completed."). */
  message?: string;
  at: number;
}

/**
 * Backend field metadata → the `ProfileField` shape `ProfileFieldRow` renders
 * (`fieldName` is the API's name for what the profile endpoints call
 * `columnName`). Every field starts blank: the backend only sends the ones with
 * no value.
 */
export function toProfileFields(fields: SwitchRoleFieldMeta[]): SwitchRoleField[] {
  return fields.map((f) => ({
    columnName: f.fieldName,
    label: f.label ?? f.fieldName,
    type: f.type ?? "string",
    // Company-owned columns can't be written by PUT /users/profile, so they are
    // shown locked regardless of what the metadata says.
    isEditable: f.isEditable !== false && f.sourceTable !== "company",
    isRequired: f.isRequired !== false,
    value: "",
  }));
}

export function setSwitchRoleHandoff(handoff: Omit<SwitchRoleHandoff, "at">): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...handoff, at: Date.now() }));
  } catch {
    /* storage unavailable — the form falls back to sending the user to /dashboard */
  }
}

export function getSwitchRoleHandoff(): SwitchRoleHandoff | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SwitchRoleHandoff;
    if (!parsed?.role || !Array.isArray(parsed.fields)) return null;
    if (Date.now() - (parsed.at ?? 0) > TTL_MS) {
      clearSwitchRoleHandoff();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSwitchRoleHandoff(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
