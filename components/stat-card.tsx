import type { ReactNode } from 'react';
export function StatCard({ label, value, detail, icon, tone='mint' }: {label:string;value:string;detail:string;icon:ReactNode;tone?:'mint'|'blue'|'peach'}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>;
}
