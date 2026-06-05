"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createPin, login } from "@/app/actions/auth-actions";

interface SafeMember {
  id: string;
  display_name: string;
  team_name: string | null;
  is_commissioner: boolean;
  has_pin: boolean;
}

export default function LoginForm({ members }: { members: SafeMember[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedMember = members.find((m) => m.id === selectedId);
  const isNewUser = selectedMember ? !selectedMember.has_pin : false;

  function handleMemberChange(id: string) {
    setSelectedId(id);
    setPin("");
    setConfirmPin("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError("");
    setLoading(true);

    try {
      if (isNewUser) {
        if (pin !== confirmPin) {
          setError("PINs do not match");
          setLoading(false);
          return;
        }
        const result = await createPin(selectedId, pin);
        if (!result.success) {
          setError(result.error ?? "Failed to create PIN");
          setLoading(false);
          return;
        }
      } else {
        const result = await login(selectedId, pin);
        if (!result.success) {
          setError(result.error ?? "Login failed");
          setLoading(false);
          return;
        }
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 16 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 20 }}>
            <Image
              src="/images/tgl_logo.png"
              alt="TGL Logo"
              width={80}
              height={80}
              style={{ borderRadius: "50%", objectFit: "cover" }}
              priority
            />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-navy)", marginBottom: 4 }}>
            The Greatest League
          </h1>
          <p style={{ color: "var(--color-gold)", fontWeight: 600, fontSize: 14, marginBottom: 24 }}>
            Rules Voting
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Member</label>
              <select
                className="select"
                value={selectedId}
                onChange={(e) => handleMemberChange(e.target.value)}
              >
                <option value="">Select your name...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedId && (
              <>
                {isNewUser && (
                  <p className="text-muted mb-8" style={{ fontSize: 13 }}>
                    First time? Create a 4-8 digit PIN to secure your account.
                  </p>
                )}

                <div className="form-group">
                  <label>{isNewUser ? "Create PIN" : "Enter PIN"}</label>
                  <input
                    className="input"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    placeholder="Enter 4-8 digit PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                {isNewUser && (
                  <div className="form-group">
                    <label>Confirm PIN</label>
                    <input
                      className="input"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      placeholder="Confirm your PIN"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                )}

                {error && <p className="error">{error}</p>}

                <button
                  type="submit"
                  className="btn btn-primary mt-16"
                  style={{ width: "100%" }}
                  disabled={loading || !pin}
                >
                  {loading ? "Please wait..." : isNewUser ? "Create PIN & Continue" : "Continue"}
                </button>
              </>
            )}
          </form>

          <p className="text-muted mt-24" style={{ fontSize: 12 }}>
            Your vote is private and secure.
          </p>
        </div>
      </div>
    </div>
  );
}
