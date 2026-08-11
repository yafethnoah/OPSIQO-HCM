export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="pageHeader">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="statusPill"><span className="statusDot" /> Foundation active</div>
    </header>
  );
}
