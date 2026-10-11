import heroPhoto from '../../../assets/san-dimas-home.jpg';

export default function ListingsHero() {
  return (
    <section className="hero" aria-label="Welcome to IDX Exchange">
      <div className="hero-inner page-container">
        <div className="hero-copy">
          <p className="hero-kicker">Residential property search</p>
          <h1>
            A little closer to
            <br />
            <span>your next home.</span>
          </h1>
          <p className="hero-description">
            Explore the photos, the possibilities, and the details that matter to you.
          </p>
        </div>
        <div className="hero-photo">
          <img
            src={heroPhoto}
            alt="A two-story home surrounded by trees and a lawn in San Dimas, California"
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
}
