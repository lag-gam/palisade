import { NavLink } from 'react-router-dom';

const linkStyle = {
  fontSize: '13px',
  textDecoration: 'none',
  padding: '6px 12px',
  borderRadius: '8px',
  transition: 'all 0.15s ease',
};

export function NavHeader() {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: '1px solid var(--border-primary)',
      background: 'var(--bg-primary)',
    }}>
      <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '17px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          Palisade
        </span>
      </NavLink>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <NavLink
          to="/"
          end
          style={({ isActive }) => ({
            ...linkStyle,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: isActive ? 'var(--bg-surface)' : 'transparent',
          })}
        >
          Home
        </NavLink>
        <NavLink
          to="/demos"
          style={({ isActive }) => ({
            ...linkStyle,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: isActive ? 'var(--bg-surface)' : 'transparent',
          })}
        >
          Demos
        </NavLink>
        <NavLink
          to="/external"
          style={({ isActive }) => ({
            ...linkStyle,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: isActive ? 'var(--bg-surface)' : 'transparent',
          })}
        >
          Agents
        </NavLink>
      </nav>
    </header>
  );
}
