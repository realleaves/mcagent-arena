import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Swords,
  Activity,
  Trophy,
  ArrowUpRight,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import type { Config } from '../lib/api';
export function Layout({ config }: { config?: Config }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="logo">
            <Terminal size={24} />
          </span>
          <span>
            McAgent<span className="brand-secondary">ARENA</span>
          </span>
        </Link>
        <p className="sidebar-label">WORKSPACE / LOCAL</p>
        <nav>
          {[
            ['/', 'Dashboard', LayoutDashboard],
            ['/arena', 'Battle Arena', Swords],
            ['/traces', 'Trace Explorer', Activity],
            ['/results', 'Results', Trophy],
          ].map(([path, label, Icon]) => {
            const I = Icon as typeof Swords;
            return (
              <NavLink key={String(path)} to={String(path)} end={path === '/'}>
                <I size={18} />
                {String(label)}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-notice">
            <ShieldCheck size={18} />
            <span>
              Read-only tools
              <br />
              <small>Local execution · v1.0</small>
            </span>
          </div>
          <a
            href={
              config?.githubUrl || 'https://github.com/search?q=McAgent+Arena&type=repositories'
            }
            target="_blank"
            rel="noreferrer"
          >
            GitHub project
            <ArrowUpRight size={15} />
          </a>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <span>
            <span className="online-dot" />
            LOCAL ARENA
          </span>
          <span className="muted">THE OPEN-SOURCE MCP AGENT BATTLE & BENCHMARK PLATFORM</span>
          <span className="version">V1.0</span>
        </div>
        <div className="content">
          <Outlet />
        </div>
        <footer>
          Same Task. Same Tools. May the Best Agent Win.
          <span>Independent project · 非麦当劳官方产品</span>
        </footer>
      </main>
    </div>
  );
}
