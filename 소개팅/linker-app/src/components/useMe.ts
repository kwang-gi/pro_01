"use client";
import { useEffect, useState } from "react";

export interface MeUser {
  id: number;
  username: string;
  role: "male_applicant" | "female_applicant" | "broker" | "admin";
  display_name: string;
  gender: "M" | "F";
  verification_status: string;
}

export interface MeLedger {
  deposit_balance: number;
  fee_balance: number;
}

export function useMe() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [ledger, setLedger] = useState<MeLedger | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setLedger(data.ledger ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, ledger, loading };
}
