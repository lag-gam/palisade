import type { ReactNode } from 'react';

interface SessionLayoutProps {
  left: ReactNode;
  middle: ReactNode;
  right: ReactNode;
}

export function SessionLayout({ left, middle, right }: SessionLayoutProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '30% 35% 35%',
      height: 'calc(100vh - 56px)',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <div style={{ borderRight: '1px solid var(--border-primary)', overflow: 'hidden' }}>
        {left}
      </div>
      <div style={{ borderRight: '1px solid var(--border-primary)', overflow: 'hidden' }}>
        {middle}
      </div>
      <div style={{ overflow: 'hidden' }}>
        {right}
      </div>
    </div>
  );
}
