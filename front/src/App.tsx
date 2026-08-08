import { useState, useEffect } from "react";
import "./App.css";
import { selectWallet } from "./selectWallet";
import { DepositForm } from "./send_deposit";
import { resolveNetwork } from "./midnight/network";
import {
  LayoutDashboard,
  Wallet,
  ArrowDownCircle,
  ShieldCheck,
  Activity,
  FileText,
  Menu,
  X,
  Database,
  Layers,
  ArrowUpRight,
  Shield,
  Copy,
  Check,
  Sparkles
} from "lucide-react";

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");

  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<string>("undeployed");
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Contract State Values
  const totalCollateral = "--";
  const totalIssued = "--";
  const yieldIndex = "--";
  const feeBps = "--";
  const accruedFees = "--";

  useEffect(() => {
    try {
      const { network } = resolveNetwork();
      setNetworkInfo(network);
    } catch {
      setNetworkInfo("undeployed");
    }
  }, []);

  const handleConnect = async () => {
    setError(null);
    try {
      const wallet = selectWallet();
      const { network } = resolveNetwork();
      const connectedApi = await wallet.connect(network);
      const { unshieldedAddress } = await connectedApi.getUnshieldedAddress();
      setWalletAddress(unshieldedAddress);
      setIsConnected(true);
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const navItems = [
    { id: "Overview", name: "Overview", icon: LayoutDashboard },
    { 
      id: "Connect Wallet", 
      name: isConnected ? "Wallet Connected" : "Connect Wallet", 
      icon: Wallet, 
      onClick: isConnected ? undefined : handleConnect 
    },
    { id: "Deposit Notes", name: "Deposit Notes", icon: ArrowDownCircle },
    { id: "ZK Security", name: "ZK Security", icon: ShieldCheck },
    { id: "Activity Log", name: "Activity Log", icon: Activity },
    { id: "Docs", name: "Docs", icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-[#19351A] text-[#F5F5EB] font-sans antialiased flex flex-col md:flex-row relative">
      {/* Mobile Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#122913] border-b border-[#C1D276]/15 sticky top-0 z-50">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#C1D276] flex items-center justify-center font-bold text-[#19351A] text-sm">
            V
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#F5F5EB]">
            VINCHI <span className="text-[#C1D276] text-xs font-normal">Protocol</span>
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg bg-[#19351A] border border-[#C1D276]/20 text-[#F5F5EB]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar (Fixed 240px) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-[240px] bg-[#122913] border-r border-[#C1D276]/15 flex flex-col justify-between p-4 z-50 transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center space-x-2.5 px-2 pt-1">
            <div className="w-8 h-8 rounded-lg bg-[#C1D276] flex items-center justify-center font-extrabold text-[#19351A] text-base">
              V
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#F5F5EB] leading-none">
                VINCHI
              </span>
              <span className="text-[10px] font-medium tracking-wide text-[#C1D276] mt-0.5">
                Protocol
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id || (item.id === "Connect Wallet" && isConnected && activeNav === "Connect Wallet");
              return (
                <button
                  key={item.id}
                  disabled={item.name === "Wallet Connected"}
                  onClick={() => {
                    setActiveNav(item.id);
                    if (item.onClick) item.onClick();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#C1D276]/15 text-[#C1D276] font-semibold"
                      : "text-[#F5F5EB]/65 hover:text-[#F5F5EB] hover:bg-white/5"
                  } ${item.name === "Wallet Connected" ? "opacity-75 cursor-default" : ""}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#C1D276]" : "text-[#F5F5EB]/40"}`} />
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-3 pt-4 border-t border-[#C1D276]/15">
          <div className="p-3 rounded-lg bg-[#19351A] border border-[#C1D276]/15">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-[#F5F5EB]/80">
                {isConnected ? "Wallet Connected" : "Connect Wallet"}
              </span>
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-[#C1D276]" : "bg-amber-400"}`} />
            </div>
            {isConnected && walletAddress ? (
              <div className="flex items-center justify-between bg-[#122913] p-1.5 rounded-md border border-[#C1D276]/10">
                <span className="text-[11px] font-mono text-[#F5F5EB]/70 truncate max-w-[130px]">
                  {walletAddress}
                </span>
                <button
                  onClick={() => copyToClipboard(walletAddress)}
                  className="p-1 hover:text-[#C1D276] transition-colors"
                >
                  {copiedAddr ? <Check className="w-3 h-3 text-[#C1D276]" /> : <Copy className="w-3 h-3 text-[#F5F5EB]/40" />}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="w-full mt-1 py-1.5 px-2.5 rounded-md bg-[#C1D276] hover:bg-[#b5c767] text-[#19351A] text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
              >
                <span>Connect</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {error && <p className="text-[10px] text-rose-400 mt-1">{error}</p>}
          </div>

          <div className="flex items-center justify-between px-2.5 py-1.5 text-xs text-[#F5F5EB]/60">
            <span>Network</span>
            <span className="text-[10px] font-medium text-[#C1D276] bg-[#C1D276]/10 px-1.5 py-0.5 rounded border border-[#C1D276]/20">
              Midnight Live
            </span>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 min-w-0 p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Top Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#C1D276]/15">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold tracking-tight text-[#F5F5EB]">
                VINCHI Protocol
              </h1>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#C1D276]/10 text-[#C1D276] border border-[#C1D276]/20">
                <span>net:{networkInfo}</span>
              </span>
            </div>
            <p className="text-xs text-[#F5F5EB]/60 mt-0.5">
              Zero-Knowledge Financial Infrastructure on Midnight Network
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button className="px-3 py-1.5 rounded-lg bg-[#122913] border border-[#C1D276]/20 hover:border-[#C1D276]/40 text-xs font-medium text-[#F5F5EB]/80 flex items-center space-x-1.5 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-[#C1D276]" />
              <span>VinchiNotes v0.31.1</span>
            </button>
          </div>
        </header>

        {/* Nav Tabs View Routing */}
        {activeNav === "Deposit Notes" ? (
          <section className="rounded-xl bg-[#122913] border border-[#C1D276]/15 p-6 space-y-4">
            <div className="border-b border-[#C1D276]/10 pb-3">
              <h2 className="text-base font-semibold text-[#F5F5EB]">Deposit Notes</h2>
              <p className="text-xs text-[#F5F5EB]/60">Mint zero-knowledge private notes into VinchiNotes smart contract</p>
            </div>
            <DepositForm />
          </section>
        ) : (
          <>
            {/* Clean Hero Panel */}
            <section className="rounded-xl bg-[#122913] border border-[#C1D276]/15 p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="text-[11px] font-mono text-[#C1D276] uppercase tracking-wider">
                  Compact Smart Contract Engine
                </div>
                <h2 className="text-lg font-bold text-[#F5F5EB] tracking-tight">
                  Zero-Knowledge Note Settlement
                </h2>
                <p className="text-xs text-[#F5F5EB]/70 leading-relaxed">
                  Direct ledger state inspection for total collateral, total issued supply, and yield index without dummy metrics or unverified analytics.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0 bg-[#19351A] px-3 py-2 rounded-lg border border-[#C1D276]/15 text-xs text-[#F5F5EB]/70">
                <Shield className="w-4 h-4 text-[#C1D276]" />
                <span className="font-mono text-[11px]">Compact 0.31.1</span>
              </div>
            </section>

            {/* Structured Compact Grid (Main Ledger Cells) */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Total Collateral */}
              <div className="rounded-xl bg-[#122913] border border-[#C1D276]/15 p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#F5F5EB]/60 font-medium">Total Collateral</span>
                  <Database className="w-4 h-4 text-[#C1D276]/60" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-[#F5F5EB] tracking-tight">
                    {totalCollateral}
                  </div>
                  <div className="text-[10px] font-mono text-[#C1D276] mt-1">
                    ledger cell: totalCollateral
                  </div>
                </div>
              </div>

              {/* Card 2: Total Issued */}
              <div className="rounded-xl bg-[#122913] border border-[#C1D276]/15 p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#F5F5EB]/60 font-medium">Total Issued</span>
                  <Layers className="w-4 h-4 text-[#C1D276]/60" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-[#F5F5EB] tracking-tight">
                    {totalIssued}
                  </div>
                  <div className="text-[10px] font-mono text-[#C1D276] mt-1">
                    ledger cell: totalIssued
                  </div>
                </div>
              </div>

              {/* Card 3: Yield Index */}
              <div className="rounded-xl bg-[#122913] border border-[#C1D276]/15 p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#F5F5EB]/60 font-medium">Yield Index</span>
                  <Sparkles className="w-4 h-4 text-[#C1D276]/60" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-[#F5F5EB] tracking-tight">
                    {yieldIndex}
                  </div>
                  <div className="text-[10px] font-mono text-[#C1D276] mt-1">
                    ledger cell: yieldIndex
                  </div>
                </div>
              </div>
            </section>

            {/* Secondary Ledger Cell Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-[#122913] border border-[#C1D276]/15 p-4 space-y-2">
                <span className="text-xs text-[#F5F5EB]/60 font-medium">Fee Bps</span>
                <div className="text-xl font-bold font-mono text-[#F5F5EB]">{feeBps}</div>
                <div className="text-[10px] font-mono text-[#F5F5EB]/40">ledger cell: feeBps</div>
              </div>

              <div className="rounded-xl bg-[#122913] border border-[#C1D276]/15 p-4 space-y-2">
                <span className="text-xs text-[#F5F5EB]/60 font-medium">Accrued Fees</span>
                <div className="text-xl font-bold font-mono text-[#F5F5EB]">{accruedFees}</div>
                <div className="text-[10px] font-mono text-[#F5F5EB]/40">ledger cell: accruedFees</div>
              </div>

              <div className="rounded-xl bg-[#122913] border border-[#C1D276]/15 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#F5F5EB]/60 font-medium">Session Status</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                    isConnected 
                      ? "text-[#C1D276] bg-[#C1D276]/10 border-[#C1D276]/20" 
                      : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                  }`}>
                    {isConnected ? "Active" : "Disconnected"}
                  </span>
                </div>
                <p className="text-xs text-[#F5F5EB]/60 mt-2">
                  {isConnected ? "Wallet ready for private proofs" : "Connect Lace wallet to execute circuits"}
                </p>
              </div>
            </section>
          </>
        )}

        {/* Minimalist Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between py-4 text-xs text-[#F5F5EB]/50 border-t border-[#C1D276]/15 gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C1D276]" />
            <span className="font-mono text-[11px]">VinchiNotes.compact • Production</span>
          </div>
          <span className="font-mono text-[11px]">Midnight Network</span>
        </footer>
      </main>
    </div>
  );
}
