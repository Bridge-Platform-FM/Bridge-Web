"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/modal/Modal";
import { Loader } from "@/components/common/loader";
import { SelectableOptionRow } from "@/components/ui/SelectableOptionRow";
import { useAuth } from "@/components/auth/AuthProvider";
import { USER_ROLES, ROLE_META, type Role } from "@/lib/roles";
import { setSwitchRoleHandoff } from "@/lib/switch-role-handoff";
import type { ApiError } from "@/lib/axios";
import type { SwitchRoleErrorData } from "@/types/api.types";

interface SwitchUserModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "Switch User" dialog — lists the three switchable user roles. Picking one and
 * confirming calls the backend (which re-issues a token for that role) via
 * useAuth().switchRole, then closes. Reuses the shared Modal + SelectableOptionRow.
 */
export function SwitchUserModal({ open, onClose }: SwitchUserModalProps) {
  const router = useRouter();
  const { role: currentRole, switchRole } = useAuth();
  const [selected, setSelected] = useState<Role>(
    (currentRole && USER_ROLES.includes(currentRole) ? currentRole : USER_ROLES[0])
  );
  const [switching, setSwitching] = useState(false);

  const handleConfirm = async () => {
    if (switching) return;
    if (selected === currentRole) {
      onClose();
      return;
    }
    setSwitching(true);
    try {
      // One call does the whole thing: POST /auth/switch-role allocates the role if the
      // user doesn't hold it yet, and only re-issues the token once an admin has approved
      // it. So a first-time switch answers "Pending" rather than switching.
      const outcome = await switchRole(selected);

      if (!outcome.switched) {
        const label = ROLE_META[selected].label;
        if (outcome.status?.toLowerCase() === "rejected") {
          // `message` carries the admin's rejection reason for this role.
          toast.error(outcome.message ?? `Your ${label} role was rejected.`);
        } else {
          toast.info(outcome.message ?? `Your ${label} role has been sent for approval.`);
        }
        onClose();
        return;
      }

      toast.success(`Switched to ${ROLE_META[selected].label}.`);
      onClose();
    } catch (err) {
      const e = err as ApiError;
      // HTTP 400 "profile not completed" — nothing switched, and the body lists the
      // required columns the target role has no value for yet. Hand those to the
      // switch-role form, which collects them and re-attempts the switch.
      const missing = (e.data as SwitchRoleErrorData | undefined)?.data?.missingFields;
      if (missing?.length) {
        onClose();
        setSwitchRoleHandoff({ role: selected, fields: missing, message: e.message });
        router.push(`/dashboard/switch-role?role=${selected}`);
        return;
      }
      toast.error(e.message ?? "Couldn't switch account type. Please try again.");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Switch Account Type"
      maxWidthClass="max-w-md"
      closeDisabled={switching}
      footer={
        <button
          type="button"
          onClick={handleConfirm}
          disabled={switching}
          className="cta-gradient flex h-11 min-w-[120px] items-center justify-center rounded-xl bg-primary px-6 font-bold text-on-primary transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {switching ? <Loader size="small" /> : "Continue"}
        </button>
      }
    >
      <p className="mb-4 text-sm text-on-surface-variant">
        Choose the account type you&apos;d like to use. We&apos;ll switch your active session.
      </p>
      <div className="flex flex-col gap-3">
        {USER_ROLES.map((role) => (
          <SelectableOptionRow
            key={role}
            icon={ROLE_META[role].icon}
            title={ROLE_META[role].label}
            subtitle={ROLE_META[role].description}
            selected={selected === role}
            onSelect={() => setSelected(role)}
            disabled={switching}
          />
        ))}
      </div>
    </Modal>
  );
}
