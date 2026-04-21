"use client";
// src/components/layout/Navbar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  const links = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/sell", label: "Sell an agent" },
    { href: "/dashboard", label: "My agents", auth: true },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-0">
        {/* Logo */}
        <Link href="/marketplace" className="flex items-center gap-2 mr-8 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center text-white text-sm font-medium">
            A
          </div>
          <span className="text-sm font-medium text-slate-900">AgentMarket</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 font-medium">
            Recruiters
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0 flex-1">
          {links.map((link) => {
            if (link.auth && !isSignedIn) return null;
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`h-14 flex items-center px-4 text-sm border-b-2 transition-colors ${
                  active
                    ? "border-brand-500 text-slate-900 font-medium"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {!isLoaded ? (
            <div className="w-20 h-8 bg-slate-100 rounded-lg animate-pulse" />
          ) : isSignedIn ? (
            <>
              <Link
                href="/sell"
                className="text-sm px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors font-medium"
              >
                List an agent
              </Link>
              <UserButton afterSignOutUrl="/marketplace" />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  Log in
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="text-sm px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors font-medium">
                  Get started
                </button>
              </SignInButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
