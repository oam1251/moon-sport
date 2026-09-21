import { NavLink } from 'react-router-dom';
import {
  IoHomeOutline,
  IoShirtOutline,
  IoCartOutline,
  IoStatsChartOutline,
} from 'react-icons/io5';

const TABS = [
  { to: '/', label: 'Inicio', icon: IoHomeOutline, end: true },
  { to: '/inventario', label: 'Inventario', icon: IoShirtOutline, end: false },
  { to: '/ventas', label: 'Ventas', icon: IoCartOutline, end: false },
  { to: '/reportes', label: 'Reportes', icon: IoStatsChartOutline, end: false },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
