import type { ReactNode } from 'react';

interface PageHeadProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function PageHead({ title, subtitle, right }: PageHeadProps) {
  return (
    <div className="page-head">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
          {subtitle && <div className="page-subtitle">{subtitle}</div>}
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
    </div>
  );
}
