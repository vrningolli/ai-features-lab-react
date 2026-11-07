/**
 * Prep Hub's site-wide navigation, shown when the lab is served at /ai-lab/.
 * Mirrors SiteNav in interview-prep-site-react (separate app, so it's a copy).
 */
export function SiteNav() {
  return (
    <header className="site-nav">
      <a className="site-brand" href="../" aria-label="Prep Hub home">
        <span className="site-logo">P</span>
        <span className="site-name">Prep Hub</span>
      </a>
      <nav className="site-links" aria-label="Site">
        <a href="../">Home</a>
        <a href="../#prep">Prep Coach</a>
        <a href="./" className="active">
          AI Lab
        </a>
      </nav>
      <span className="made-by">
        made with <span className="heart" aria-label="love">♥</span> · Virupaksh N
      </span>
    </header>
  );
}
