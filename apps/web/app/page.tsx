"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  ArrowDownCircle,
  BarChart3,
  Vault,
  ShieldCheck,
  Activity,
  FileText,
  Bell,
  ExternalLink,
  Menu,
  X,
  Lock,
  TrendingUp,
  Cpu,
  Database,
  CheckCircle2,
  Server,
  Layers,
  ArrowUpRight,
  Radio,
  ChevronRight,
  Shield,
  Circle,
  BookOpen
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";

// --- Mock Data ---

const apyData = [
  { day: "Mon", apy: 5.82 },
  { day: "Tue", apy: 5.95 },
  { day: "Wed", apy: 6.10 },
  { day: "Thu", apy: 6.05 },
  { day: "Fri", apy: 6.28 },
  { day: "Sat", apy: 6.35 },
  { day: "Sun", apy: 6.42 }
];

const collateralData = [
  { name: "Collateralized", value: 185.4, color: "#6366F1" },
  { name: "Unused Cap", value: 114.6, color: "#1E293B" }
];

const recentActivity = [
  {
    id: 1,
    title: "Vault Collateral Rebalance",
    hash: "0x8f3a...4b91",
    time: "2 mins ago",
    status: "Confirmed",
    icon: ShieldCheck
  },
  {
    id: 2,
    title: "ZK-Proof Generation",
    hash: "0x12c4...e902",
    time: "14 mins ago",
    status: "Verified",
    icon: Lock
  },
  {
    id: 3,
    title: "USDv Minting Execution",
    hash: "0x77d1...00f8",
    time: "1 hour ago",
    status: "Confirmed",
    icon: ArrowDownCircle
  },
  {
    id: 4,
    title: "Midnight WASM Verification",
    hash: "0x3e9b...a12c",
    time: "3 hours ago",
    status: "Verified",
    icon: Cpu
  },
  {
    id: 5,
    title: "Yield Settlement",
    hash: "0x5a11...c3df",
    time: "5 hours ago",
    status: "Confirmed",
    icon: TrendingUp
  }
];

export default function DashboardPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");

  const navItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Connect Wallet", icon: Wallet },
    { name: "Deposit", icon: ArrowDownCircle },
    { name: "Operations Analytics", icon: BarChart3 },
    { name: "Vaults", icon: Vault },
    { name: "Security", icon: ShieldCheck },
    { name: "Activity", icon: Activity },
    { name: "Docs", icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 antialiased flex flex-col md:flex-row relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-10 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 bg-[#0B1220]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-blue-500 flex items-center justify-center font-extrabold text-white text-xl shadow-lg shadow-indigo-500/20">
            V
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            VINCHI <span className="text-indigo-400 font-normal text-sm ml-1">Protocol</span>
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Fixed 280px on desktop) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-[280px] bg-[#0B1220]/80 backdrop-blur-md border-r border-white/10 flex flex-col justify-between p-6 z-50 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-8">
          {/* Logo Section */}
          <div className="flex items-center space-x-3.5 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-blue-500 flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-indigo-500/25">
              V
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-white leading-none">
                VINCHI
              </span>
              <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase mt-1">
                Protocol
              </span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveNav(item.name);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600/30 to-blue-600/10 text-white border border-indigo-500/30 shadow-md shadow-indigo-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? "text-indigo-400" : "text-slate-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Cards */}
        <div className="space-y-4 pt-6 border-t border-white/10">
          {/* Connect Wallet Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-slate-900/60 border border-indigo-500/20 shadow-inner">
            <div className="flex items-center space-x-2.5 mb-2">
              <Wallet className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-white">Connect Wallet</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Access institutional zero-knowledge vaults and private yields.
            </p>
            <button className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold transition-all duration-200 shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-1.5">
              <span>Connect Wallet</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Network Indicator */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/5">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-slate-300">
                Midnight Network
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Live
            </span>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header Superior */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
          <div>
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                VINCHI Protocol
              </h1>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Network: undeployed</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Institutional Private Yield Infrastructure
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-3 self-start md:self-auto">
            <button className="p-2.5 rounded-xl bg-[#0B1220]/80 border border-white/10 hover:border-blue-500/30 text-slate-300 hover:text-white transition-all duration-200 backdrop-blur-sm shadow-sm">
              <BookOpen className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-xl bg-[#0B1220]/80 border border-white/10 hover:border-blue-500/30 text-slate-300 hover:text-white transition-all duration-200 backdrop-blur-sm shadow-sm relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Hero Principal */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/60 via-[#0B1220]/90 to-violet-950/40 border border-white/10 p-6 sm:p-8 backdrop-blur-sm shadow-xl hover:border-blue-500/30 transition-all duration-200">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start space-x-5 max-w-2xl">
              <div className="p-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/10">
                <Shield className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Midnight Network ZK Vault Infrastructure
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Institutional-grade zero-knowledge yield architecture delivering fully private smart contract execution, compliant auditing hooks, and optimized capital efficiency on Midnight Network.
                </p>
              </div>
            </div>

            {/* Abstract Blockchain Illustration */}
            <div className="relative shrink-0 flex items-center justify-center py-4 lg:py-0">
              <div className="w-48 h-28 relative flex items-center justify-center">
                {/* Glowing Nodes & Lines */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-2xl border border-indigo-500/20 backdrop-blur-md" />
                <div className="flex items-center space-x-4 z-10">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/40 text-indigo-400 shadow-md">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="w-8 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500 animate-pulse" />
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-violet-500/40 text-violet-400 shadow-md">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="w-8 h-[2px] bg-gradient-to-r from-violet-500 to-blue-500 animate-pulse" />
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/40 text-blue-400 shadow-md">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Grid de Métricas (3 columnas) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: TVL */}
          <div className="rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-400">Total Value Locked</span>
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Vault className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tight">$24,580,900</div>
              <div className="text-xs font-semibold text-emerald-400 mt-2 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+14.2% this week</span>
              </div>
            </div>
          </div>

          {/* Card 2: Target APY */}
          <div className="rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-400">Target APY</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tight">6.42%</div>
              <div className="text-xs font-semibold text-emerald-400 mt-2 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+0.8% net yield</span>
              </div>
            </div>
          </div>

          {/* Card 3: Collateral Ratio */}
          <div className="rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-400">Collateral Ratio</span>
              <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tight">185.4%</div>
              <div className="text-xs font-semibold text-emerald-400 mt-2 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Over-collateralized</span>
              </div>
            </div>
          </div>
        </section>

        {/* Segunda Fila (3 columnas) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Issued USDv Supply */}
          <div className="rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-sm font-medium text-slate-400">Issued USDv Supply</span>
              <div className="text-2xl font-bold text-white tracking-tight mt-3">13,250,000</div>
            </div>
            <div className="pt-4 border-t border-white/5 mt-4">
              <p className="text-xs text-slate-400 font-medium">1 USDv = $1.00 USD</p>
            </div>
          </div>

          {/* Card 2: Wallet Connection */}
          <div className="rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Wallet Connection</span>
                <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  Required
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Connect your web3 wallet to interact with zero-knowledge vaults.
              </p>
            </div>
            <div className="mt-4">
              <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition-colors">
                <span>Connect Wallet</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Security Telemetry */}
          <div className="rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-sm font-medium text-slate-400">Security Telemetry</span>
              <div className="text-xs font-semibold text-indigo-400 mt-1">Midnight ZK</div>
            </div>
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">WASM Prover</span>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400 font-medium">Active</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Indexer</span>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400 font-medium">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tercera Fila: Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Izquierda (2/3): APY Performance */}
          <div className="lg:col-span-2 rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">APY Performance</h3>
                <p className="text-xs text-slate-400">Yield evolution over the current week</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">6.42%</div>
                <span className="text-xs text-emerald-400 font-medium">Current Net</span>
              </div>
            </div>
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={apyData}>
                  <defs>
                    <linearGradient id="colorApy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={["dataMin - 0.2", "dataMax + 0.2"]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0B1220",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="apy"
                    stroke="#6366F1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorApy)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Derecha (1/3): Collateralization */}
          <div className="rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Collateralization</h3>
              <p className="text-xs text-slate-400">System backing breakdown</p>
            </div>

            {/* Donut Chart with Overlay Text */}
            <div className="relative h-52 w-full flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={collateralData}
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {collateralData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white">185.4%</span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mt-0.5">
                  Safe
                </span>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-white/5">
              <p className="text-xs text-slate-400">
                Optimal range: <span className="text-slate-200 font-medium">150%–300%</span>
              </p>
            </div>
          </div>
        </section>

        {/* Cuarta Fila */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Izquierda (2/3): Recent Activity */}
          <div className="lg:col-span-2 rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-white">Recent Activity</h3>
                  <p className="text-xs text-slate-400">Latest protocol transactions and ZK proofs</p>
                </div>
              </div>

              {/* Event List */}
              <div className="space-y-3">
                {recentActivity.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div
                      key={act.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="p-2.5 rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/20">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-200">{act.title}</div>
                          <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                            <span className="font-mono">{act.hash}</span>
                            <span>•</span>
                            <span>{act.time}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        {act.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
              <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition-colors">
                <span>View all activity</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Derecha (1/3): Network Status & Protocol Info */}
          <div className="space-y-5 flex flex-col">
            {/* Card Network Status */}
            <div className="rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 shadow-lg flex-1">
              <h3 className="text-base font-semibold text-white mb-4">Network Status</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Midnight Network</span>
                  <span className="text-emerald-400 font-medium">Operational</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">ZK Prover</span>
                  <span className="text-emerald-400 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Indexer</span>
                  <span className="text-emerald-400 font-medium">Connected</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">RPC Endpoint</span>
                  <span className="text-emerald-400 font-medium">Healthy</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Block Height</span>
                  <span className="text-slate-200 font-mono">#104,921</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400">Uptime</span>
                  <span className="text-emerald-400 font-medium">99.98%</span>
                </div>
              </div>
            </div>

            {/* Card Protocol Info */}
            <div className="rounded-3xl bg-[#0B1220]/80 border border-white/10 p-6 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-200 shadow-lg">
              <h3 className="text-base font-semibold text-white mb-2">Protocol Info</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                VINCHI PROTOCOL Zero-Knowledge Financial Infrastructure
              </p>
              <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition-colors">
                <span>View Documentation</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between py-4 text-xs text-slate-500 border-t border-white/5 gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>v1.0.0 Production</span>
          </div>
          <div>
            <span>Midnight Network</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
