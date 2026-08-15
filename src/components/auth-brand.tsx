export function AuthBrand({ eyebrow = 'Enterprise HCM' }: { eyebrow?: string }) {
  return (
    <div className="authBrand">
      <img className="authBrandLogo" src="/brand/opsiqo-wordmark.png" alt="OPSIQO" />
      <span className="authBrandEyebrow">{eyebrow}</span>
      <p>Forward motion. Built for teams that move.</p>
    </div>
  );
}
