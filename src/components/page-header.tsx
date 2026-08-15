export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="pageHeader">
      <div className="pageHeaderCopy">
        <span className="eyebrow">OPSIQO HCM</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="statusPill"><span className="statusDot" /> v8.5 platform active</div>
    </header>
  );
}
