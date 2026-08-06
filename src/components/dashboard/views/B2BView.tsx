"use client";

import { useEffect, useState } from 'react';
import { fetchUserDashboard } from '@/services/dashboard.service';
import { RoleDashboard } from './RoleDashboard';

interface ApiError {
  message: string;
  status?: number;
  data?: unknown;
}

interface DashboardData {
  profile?: any;
  stats?: {
    connectionsReceived: number;
    activeDealRooms: number;
    connectionsAccepted: number;
    kycDocumentsCount: number;
    [key: string]: any;
  };
}

export function B2BView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await fetchUserDashboard();
        setData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        if (err && typeof err === 'object' && 'message' in err) {
          setError((err as ApiError).message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to fetch dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Error loading dashboard</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !data.stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-600">
          <p>No dashboard data available</p>
        </div>
      </div>
    );
  }

  return (
    <RoleDashboard
      title="B2B Marketplace Dashboard"
      subtitle="Connect with partners and manage contracts."
      stats={[
        {
          label: "Marketplace Leads",
          value: String(data.stats.connectionsReceived || 0),
          icon: "storefront"
        },
        {
          label: "Active Contracts",
          value: String(data.stats.activeDealRooms || 0),
          icon: "contract"
        },
        {
          label: "Partners",
          value: String(data.stats.connectionsAccepted || 0),
          icon: "diversity_3"
        },
        {
          label: "Documents",
          value: String(data.stats.kycDocumentsCount || 0),
          icon: "folder"
        },
      ]}
      placeholder="Browse available business opportunities, manage contracts, and collaborate with partners."
    />
  );
}
