"use client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ScanSearch,
  Gem,
  BookOpenText,
  Fingerprint,
  Mail,
  UserCircle,
  Zap,
} from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname(); // To highlight active pages

  const navLinks = [
    {
      name: "Analyze",
      path: "/check",
      icon: <ScanSearch size={16} className="mr-2 inline-block opacity-70" />,
    },
    {
      name: "Pricing",
      path: "/pricing",
      icon: <Gem size={16} className="mr-2 inline-block opacity-70" />,
    },
    {
      name: "Real Stories",
      path: "/stories",
      icon: <BookOpenText size={16} className="mr-2 inline-block opacity-70" />,
    },
    {
      name: "About Us",
      path: "/about",
      icon: <Fingerprint size={16} className="mr-2 inline-block opacity-70" />,
    },
  ];

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50 glass-panel px-6 py-3 rounded-2xl flex items-center justify-between border border-white/10 shadow-2xl backdrop-blur-md bg-[#0f172a]/60">
      {/* Brand */}
      <span
        className="text-2xl font-black italic tracking-tighter cursor-pointer text-white flex-shrink-0"
        onClick={() => router.push("/")}
      >
        UNI<span className="text-blue-500">MATE</span>
      </span>

      {/* Main Links - Evenly Spaced */}
      <div className="hidden lg:flex items-center justify-center gap-8 text-sm font-medium flex-1 px-8">
        {navLinks.map((link) => (
          <button
            key={link.name}
            onClick={() => router.push(link.path)}
            className={`transition-colors hover:text-blue-400 ${pathname === link.path ? "text-blue-400 font-bold" : "text-slate-300"}`}
          >
            {link.icon}
            {link.name}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-white hidden md:flex"
          onClick={() => router.push("/contact")}
        >
          <Mail size={16} className="mr-2" /> Write Us
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-white"
          onClick={() => router.push("/login")}
        >
          <UserCircle size={16} className="mr-2" /> Login
        </Button>

        <Button
          onClick={() => router.push("/pricing")}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all active:scale-95"
        >
          <Zap size={16} className="mr-2 fill-current" /> PRO
        </Button>
      </div>
    </nav>
  );
}
