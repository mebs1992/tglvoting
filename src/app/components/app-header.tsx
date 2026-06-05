"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth-actions";

interface AppHeaderProps {
  memberName: string;
  isCommissioner: boolean;
}

export default function AppHeader({ memberName, isCommissioner }: AppHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="header">
      <div className="flex items-center gap-8">
        <Image
          src="/images/tgl_logo.png"
          alt="TGL"
          width={40}
          height={40}
          className="header-logo"
        />
        <span className="header-title">TGL</span>
      </div>

      <nav className="header-nav">
        <Link href="/dashboard">Voting</Link>
        <Link href="/results">Results</Link>
        {isCommissioner && (
          <Link href="/commissioner" style={{ color: "var(--color-gold)" }}>
            Commissioner
          </Link>
        )}
        <span className="member-badge">{memberName}</span>
        <button
          onClick={handleLogout}
          className="btn btn-sm btn-outline"
          style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
        >
          Logout
        </button>
      </nav>
    </header>
  );
}
