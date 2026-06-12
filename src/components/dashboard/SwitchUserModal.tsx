"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modal/Modal";
import { Loader } from "@/components/common/loader";
import { SelectableOptionRow } from "@/components/ui/SelectableOptionRow";
import { useAuth } from "@/components/auth/AuthProvider";
import { USER_ROLES, ROLE_META, type Role } from "@/lib/roles";
import type { ApiError } from "@/lib/axios";

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
      await switchRole(selected);
      toast.success(`Switched to ${ROLE_META[selected].label}.`);
      onClose();
    } catch (err) {
      toast.error((err as ApiError).message ?? "Couldn't switch account type. Please try again.");
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
