"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type User = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
};

/**
 * Admin Users Client Component
 * Display all users from Supabase Auth
 */
export default function AdminUsersClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const checkAccessAndFetchUsers = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || user.user_metadata?.role !== "admin") {
          router.replace("/login");
          return;
        }

        setIsAuthorized(true);

        // Fetch users via API route (server-side)
        const response = await fetch("/api/admin/users");
        if (!response.ok) {
          // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to fetch users");
          }
          // エラー時は空配列を設定（UIが壊れないように）
          setUsers([]);
          return;
        }

        const data = await response.json();
        setUsers(data.users || []);
      } catch (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("Admin users fetch error:", error);
        }
        // エラー時は空配列を設定（UIが壊れないように）
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    void checkAccessAndFetchUsers();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Users</h1>
            <p className="mt-1 text-sm text-slate-400">
              All registered users ({users.length})
            </p>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Log out
            </button>
          </nav>
        </header>

        {/* Users Table */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/40 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-300 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-300 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-300 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-300 uppercase">
                    Last Login
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-white">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-red-500/20 text-red-300"
                              : user.role === "brand"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-sky-500/20 text-sky-300"
                          }`}
                        >
                          {user.role || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {formatDate(user.last_sign_in_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

