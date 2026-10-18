import React from "react";
import { FileText, Download, CheckCircle2, Clock } from "lucide-react";

export function Contracts() {
  const contracts = [
    {
      id: "CNT-0912",
      brand: "Nova Skincare",
      date: "Oct 12, 2026",
      amount: "$2,400.00",
      status: "active",
    },
    {
      id: "CNT-0844",
      brand: "Lumina Tech",
      date: "Sep 28, 2026",
      amount: "$1,850.00",
      status: "completed",
    },
    {
      id: "CNT-0810",
      brand: "Aura Apparels",
      date: "Sep 15, 2026",
      amount: "$3,200.00",
      status: "completed",
    },
    {
      id: "CNT-0792",
      brand: "Zenith Fitness",
      date: "Aug 30, 2026",
      amount: "$1,500.00",
      status: "pending",
    },
  ];

  return (
    <div className="space-y-12">
      <header className="border-b border-zinc-800 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <p className="text-zinc-400 uppercase tracking-widest text-xs font-semibold mb-2">
            Legal & Financial
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
            Contracts
          </h1>
          <p className="text-zinc-400 max-w-2xl text-lg">
            Manage your active agreements and download historical invoices.
          </p>
        </div>
        <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" /> Export All
        </button>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                <th className="p-4 pl-6 font-medium">Contract Ref</th>
                <th className="p-4 font-medium">Counterparty</th>
                <th className="p-4 font-medium">Execution Date</th>
                <th className="p-4 font-medium">Value</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 pr-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-zinc-800/50">
              {contracts.map((cur) => (
                <tr
                  key={cur.id}
                  className="hover:bg-zinc-800/30 transition-colors group"
                >
                  <td className="p-4 pl-6 font-mono text-zinc-300">{cur.id}</td>
                  <td className="p-4 font-medium text-white">{cur.brand}</td>
                  <td className="p-4 text-zinc-400">{cur.date}</td>
                  <td className="p-4 text-zinc-300">{cur.amount}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                       ${
                         cur.status === "active"
                           ? "bg-indigo-500/10 text-indigo-400"
                           : cur.status === "completed"
                             ? "bg-emerald-500/10 text-emerald-400"
                             : "bg-amber-500/10 text-amber-400"
                       }
                     `}
                    >
                      {cur.status === "active" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      )}
                      {cur.status === "completed" && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {cur.status === "pending" && (
                        <Clock className="w-3 h-3" />
                      )}
                      {cur.status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button className="text-zinc-500 hover:text-indigo-400 p-2 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
