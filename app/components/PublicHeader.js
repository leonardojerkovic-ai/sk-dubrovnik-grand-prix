export default function PublicHeader({ active = '' }) {
  const items = [
    ['/', 'Početna'],
    ['/o-nama', 'O nama'],
    ['/turniri', 'Turniri'],
    ['/poredak', 'Ljestvice'],
    ['/rezultati', 'Rezultati'],
    ['/vijesti', 'Vijesti'],
    ['/faq', 'FAQ'],
    ['/kontakt', 'Kontakt'],
  ];

  return (
    <header className="top">
      <div className="top-inner">
        <a href="/" className="brand" aria-label="ŠK Dubrovnik Grand Prix - početna">
          <img className="mark" src="/logo.png" alt="ŠK Dubrovnik" />
          <span>ŠK Dubrovnik <b>Grand Prix</b></span>
        </a>
        <nav className="primary" aria-label="Glavna navigacija">
          {items.map(([href, label]) => (
            <a key={href} href={href} className={active === href ? 'active' : ''}>{label}</a>
          ))}
        </nav>
        <a className="header-cta" href="/prijave">Prijavi se</a>
      </div>
    </header>
  );
}
