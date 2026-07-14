"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";

/** The Bridge Platform glyph (no wordmark). The color is inherited (currentColor). */
export function BridgeMark({ className = "size-8 text-blue-600" }: { className?: string }) {
    return (
        <div className={`${className} shrink-0`}>
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path
                    clipRule="evenodd"
                    d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z"
                    fill="currentColor"
                    fillRule="evenodd"
                />
                <path
                    clipRule="evenodd"
                    d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z"
                    fill="currentColor"
                    fillRule="evenodd"
                />
            </svg>
        </div>
    );
}

/** Bridge Platform logo lockup (glyph + wordmark), shared by the navbar and sidebar. */
export function BrandLockup({ className = "", showLabel = true }: { className?: string; showLabel?: boolean }) {
    return (
        <span className={`flex items-center gap-3 ${className}`}>
            <BridgeMark />
            <span
                className={`overflow-hidden whitespace-nowrap font-bold text-xl tracking-tight transition-[max-width,opacity] duration-200 ${
                    showLabel ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
                }`}
            >
                Bridge Platform
            </span>
        </span>
    );
}

/**
 * Dashboard variant of the navbar. Rendered inside the dashboard content column
 * (to the right of the sidebar), so it starts where the sidebar ends. It omits the
 * brand lockup (the sidebar already shows it) and surfaces only the notifications
 * control (the user/role identity lives in the sidebar).
 */
export function DashboardNavbar() {
    return (
        <header className="grid h-16 shrink-0 grid-cols-[1fr_3fr_1fr] items-center gap-2 border-b border-outline-variant/30 bg-surface-container-lowest px-6">
            <div />
            <div className="w-full justify-self-center">
                <Input
                    type="search"
                    placeholder="Search"
                    aria-label="Search"
                    adornment={<Icon name="search" size={18} />}
                    className="!rounded-full"
                />
            </div>
            <button
                type="button"
                aria-label="Notifications"
                className="flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface justify-self-end"
            >
                <Icon name="notifications" size={22} />
            </button>
        </header>
    );
}

export function Navbar() {
    const pathname = usePathname();
    // The dashboard owns its own chrome (sidebar + DashboardNavbar), so hide the
    // global navbar there.
    if (pathname?.startsWith("/dashboard")) return null;

    return (
        <nav className="flex-none flex items-center justify-between px-8 py-2 w-full max-w-7xl mx-auto">
            <BrandLockup />
            <Link
                href="/"
                className="flex items-center gap-2 text-slate-500 cursor-pointer group"
            >
                {/* <ArrowLeft size={20} />
                <span className="text-sm font-medium group-hover:text-blue-600 transition-colors">
                    Return to Website
                </span> */}
            </Link>
        </nav>
    );
}
