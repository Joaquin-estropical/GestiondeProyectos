import type { ReactNode } from 'react';

interface PageHeadProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function PageHead({ title, subtitle, right }: PageHeadProps) {
  return (
    <div className="page-head">
      <div className="row between items-center">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <div className="page-subtitle">{subtitle}</div>}
        </div>
        {right && <div>{right}</div>}
      </div>
    </div>
  );
}
