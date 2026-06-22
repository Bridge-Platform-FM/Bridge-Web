"use client";

import { useCallback, useEffect, useState } from "react";
import { AsyncState } from "@/components/ui/AsyncState";
import { ProfileGridCard } from "@/components/dashboard/explore/ProfileGridCard";
import { fetchExploreMatches } from "@/services/explore.service";
import type { ExploreMatch } from "@/types/api.types";

/**
 * Explore **grid** view — the same matches as the "Shorts Mode" deck, shown as a
 * scrollable, responsive card grid for browsing. Loads its own copy via the shared
 * `fetchExploreMatches` service (so it stays in sync with the swipe deck's source).
 */
export function ProfileGridView() {
  const [matches, setMatches] = useState<ExploreMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchExploreMatches()
      .then((data) => setMatches(data))
      .catch(() => setError("Couldn't load matches. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() drives loading state; runs once on mount
    load();
  }, [load]);

  return (
    <div className="thin-scrollbar h-full overflow-y-auto bg-surface px-6 pb-6 pt-16">
      <AsyncState
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={!loading && !error && matches.length === 0}
        emptyIcon="group_off"
        emptyText="No matches to explore right now."
      >
        <div className="flex flex-col gap-5">
          {matches.map((match) => (
            <ProfileGridCard key={match.profileId} match={match} />
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
