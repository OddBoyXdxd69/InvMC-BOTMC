"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Trophy, 
  Users, 
  Play, 
  History, 
  TrendingUp,
  Activity,
  Lock
} from "lucide-react";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  const menuItems = [
    { icon: Activity, label: "Live Dashboard", href: "/" },
    { icon: Users, label: "Player Directory", href: "/players" },
    { icon: Trophy, label: "Hall of Fame", href: "/hall-of-fame" },
    { icon: Play, label: "Create Match", href: "/matches/new" },
    { icon: Lock, label: "Admin Panel", href: "/admin" },
  ];

  const NavItem = ({ item }: { item: any }) => {
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
          isActive 
            ? "text-emerald-400 font-semibold bg-emerald-500/8 border-l-2 border-emerald-500" 
            : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-100"
        )}
      >
        <item.icon className={cn(
          "w-5 h-5 transition-all duration-300 relative z-10",
          isActive ? "text-emerald-400 scale-110" : "group-hover:text-slate-200 group-hover:scale-110"
        )} />
        <span className="text-sm relative z-10">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="w-64 h-screen border-r border-slate-900 bg-slate-950 flex flex-col relative z-10">
      <div className="p-6 mb-2">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl group">
          <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all duration-300">
            <Trophy className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="tracking-tight text-white font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">CricketScorer</span>
        </Link>
      </div>

      <div className="flex-1 px-4 space-y-6 overflow-y-auto">
        <div className="space-y-2">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Main Menu
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </nav>
        </div>
      </div>

      <div className="p-4 mt-auto border-t border-slate-900 bg-slate-950 text-center">
        <p className="text-[10px] text-slate-600 font-light">Cricket Management &copy; 2026</p>
      </div>
    </div>
  );
}
