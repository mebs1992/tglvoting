"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth-actions";

interface AppHeaderProps {
  memberName: string;
  isCommissioner: boolean;
}

export default function AppHeader({ memberName, isCommissioner }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <header className="app-header">
      <div className="app-header-top">
        <Link href="/dashboard" className="app-header-brand">
          <Image
            src="/images/tgl_logo.png"
            alt="TGL"
            width={36}
            height={36}
            className="header-logo"
          />
          <span className="app-header-title">The Greatest League</span>
        </Link>
        <div className="app-header-user">
          <span className="app-header-member">{memberName}</span>
          <button onClick={handleLogout} className="app-header-logout">
            Sign Out
          </button>
        </div>
      </div>
      <nav className="app-header-nav">
        <Link
          href="/dashboard"
          className={`app-header-link ${isActive("/dashboard") ? "active" : ""}`}
        >
          Open Issues
        </Link>
        <Link
          href="/results"
          className={`app-header-link ${isActive("/results") ? "active" : ""}`}
        >
          Results
        </Link>
        {isCommissioner && (
          <Link
            href="/commissioner"
            className={`app-header-link commissioner ${isActive("/commissioner") ? "active" : ""}`}
          >
            Commissioner Panel
          </Link>
        )}
      </nav>
    </header>
  );
}
