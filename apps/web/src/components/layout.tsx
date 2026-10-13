import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Swords,
  Activity,
  Trophy,
  ArrowUpRight,
  ShieldCheck,
  Sandwich,
} from 'lucide-react';
import type { Config } from '../lib/api';
export function Layout({ config }: { config?: Config }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="logo">
            <Sandwich size={24} />
          </span>
          <span>
            McAgent<span className="brand-secondary">ARENA</span>
          </span>
        </Link>
        <p className="sidebar-label">麦麦助手验证台 / 本机</p>
        <nav>
          {[
            ['/', '首页与使用指南', LayoutDashboard],
            ['/arena', '助手对比', Swords],
            ['/traces', '工具调用轨迹', Activity],
            ['/results', '验收记录', Trophy],
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
              麦当劳只读查询
              <br />
              <small>营养 · 活动 · 时间信息</small>
            </span>
          </div>
          <a
            href={config?.githubUrl || 'https://github.com/realleaves/mcagent-arena'}
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
            麦麦业务场景 / LOCAL
          </span>
          <span className="muted">查营养 · 找活动 · 验证可信回答</span>
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
