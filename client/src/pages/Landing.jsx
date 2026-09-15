import Logo from '../components/common/Logo'
import Button from '../components/common/Button'
import SectionHeading from '../components/common/SectionHeading'
import ShadeSwatch from '../components/common/ShadeSwatch'
import Badge from '../components/common/Badge'
import SkinProfilePanel from '../components/matching/SkinProfilePanel'
import { skinProfiles, mockShades } from '../utils/mockData'
import styles from './Landing.module.css'

const processSteps = [
  {
    step: '01',
    title: 'Upload a photo',
    body: 'The artist captures or uploads a natural-light photo of the client, no filters or heavy makeup.',
  },
  {
    step: '02',
    title: 'Skin analysis',
    body: 'ShadeMatch reads depth, undertone and hue from the image to build a structured skin profile.',
  },
  {
    step: '03',
    title: 'Foundation comparison',
    body: 'The artist selects a brand and product, and ShadeMatch compares the profile against every shade.',
  },
  {
    step: '04',
    title: 'Top matches',
    body: 'The three closest shades are returned, each with a plain-language explanation of the match.',
  },
]

const benefits = [
  {
    title: 'Built for artists',
    body: 'Designed around how makeup artists actually work with clients, not a generic beauty quiz.',
  },
  {
    title: 'Undertone-aware',
    body: 'Goes beyond depth alone to weigh warm, cool and neutral undertones in every comparison.',
  },
  {
    title: 'Explained, not just scored',
    body: 'Every match comes with the reasoning behind it, so the final call stays with the artist.',
  },
  {
    title: 'Works across brands',
    body: 'Compare a client’s profile against shade ranges from the brands you already carry.',
  },
]

const previewShades = mockShades.p1.filter((shade) =>
  ['nc25', 'nc30', 'nc35', 'nc40', 'nc42', 'nc45'].includes(shade.id)
)

function Landing() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo />
        <nav className={styles.headerNav} aria-label="Site">
          <a href="#how-it-works">How it works</a>
          <a href="#why-shadematch">Why ShadeMatch</a>
          <Button to="/login" variant="ghost" size="sm">
            Log in
          </Button>
          <Button to="/login" size="sm">
            Start Matching
          </Button>
        </nav>
      </header>

      {/* 1. Hero */}
      <section className={`${styles.hero} grain`}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>AI-assisted shade matching</p>
          <h1 className={styles.heroTitle}>
            Foundation should match the person,
            <br />
            not the other way around.
          </h1>
          <p className={styles.heroSubtitle}>
            ShadeMatch helps makeup artists find foundation shades that complement every
            client&rsquo;s unique skin tone and undertone.
          </p>
          <div className={styles.heroActions}>
            <Button to="/login" size="lg">
              Start Matching
            </Button>
            <Button href="#how-it-works" variant="secondary" size="lg">
              How it works
            </Button>
          </div>
        </div>

        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.heroPanel}>
            <div className={styles.heroPanelGlow} />
            <span className={styles.heroPanelLabel}>Skin Profile</span>
            <span className={styles.heroPanelValue}>Warm &middot; Medium Deep</span>
            <div className={styles.heroSwatchRow}>
              {previewShades.slice(0, 5).map((shade) => (
                <ShadeSwatch key={shade.id} hex={shade.hex} size="lg" />
              ))}
            </div>
          </div>
          <div className={styles.heroFloatingCard}>
            <span className={styles.heroFloatingScore}>94%</span>
            <span className={styles.heroFloatingLabel}>Match score</span>
          </div>
        </div>
      </section>

      {/* 2. The problem */}
      <section className={styles.section}>
        <div className={styles.problemGrid}>
          <SectionHeading
            eyebrow="The problem"
            title="Shade selection is still mostly guesswork."
            subtitle="Artists compare a handful of shades against a client's wrist or jawline under whatever light is available, and hope it holds up later. Diverse undertones and depths make that process inconsistent, especially under time pressure."
          />
          <div className={styles.problemStat}>
            <p className={styles.statNumber}>1 in 3</p>
            <p className={styles.statCaption}>
              foundation matches made in-store are returned or re-done because the shade
              didn&rsquo;t hold up in natural light.
            </p>
          </div>
        </div>
      </section>

      {/* 3. How ShadeMatch works */}
      <section id="how-it-works" className={styles.section}>
        <SectionHeading
          eyebrow="How it works"
          title="From photo to shade in four steps"
          subtitle="A structured process that keeps the artist in control at every step."
          align="center"
        />
        <div className={styles.processGrid}>
          {processSteps.map((item) => (
            <div key={item.step} className={styles.processCard}>
              <span className={styles.processStep}>{item.step}</span>
              <h3 className={styles.processTitle}>{item.title}</h3>
              <p className={styles.processBody}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Skin profile */}
      <section className={styles.section}>
        <div className={styles.showcaseGrid}>
          <SectionHeading
            eyebrow="Skin profile"
            title="A structured read of depth, undertone and hue"
            subtitle="Every analysis returns a clear profile the artist can act on immediately, with a confidence score attached rather than false certainty."
          />
          <div className={styles.showcaseCard}>
            <SkinProfilePanel profile={skinProfiles.amara} />
          </div>
        </div>
      </section>

      {/* 5. Foundation matching */}
      <section className={styles.section}>
        <div className={styles.showcaseGridReverse}>
          <div className={styles.showcaseCard}>
            <p className={styles.matchPreviewLabel}>MAC Studio Fix Fluid</p>
            <div className={styles.matchPreviewRow}>
              {previewShades.map((shade) => (
                <div key={shade.id} className={styles.matchPreviewItem}>
                  <ShadeSwatch hex={shade.hex} size="lg" />
                  <span>{shade.name}</span>
                </div>
              ))}
            </div>
            <Badge tone="rose">NC40 &middot; 94% match score</Badge>
          </div>
          <SectionHeading
            eyebrow="Foundation matching"
            title="Compare against the shades you already stock"
            subtitle="Select a brand and product, and ShadeMatch scores every shade in the range against the client's profile, then surfaces the closest three."
          />
        </div>
      </section>

      {/* 6. Why ShadeMatch */}
      <section id="why-shadematch" className={styles.section}>
        <SectionHeading
          eyebrow="Why ShadeMatch"
          title="A tool that respects the artist's eye"
          align="center"
          subtitle="ShadeMatch is an assistive estimate, not a replacement for professional judgment."
        />
        <div className={styles.benefitsGrid}>
          {benefits.map((benefit) => (
            <div key={benefit.title} className={styles.benefitCard}>
              <h3 className={styles.benefitTitle}>{benefit.title}</h3>
              <p className={styles.benefitBody}>{benefit.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. CTA */}
      <section className={`${styles.cta} grain`}>
        <h2 className={styles.ctaTitle}>Start matching with confidence.</h2>
        <p className={styles.ctaSubtitle}>
          Bring your next client into ShadeMatch and see their profile in minutes.
        </p>
        <Button to="/login" size="lg">
          Start Matching
        </Button>
      </section>

      {/* 8. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Logo />
          <p className={styles.footerTagline}>
            AI-assisted foundation shade matching for makeup artists.
          </p>
        </div>
        <div className={styles.footerLinks}>
          <div>
            <p className={styles.footerHeading}>Product</p>
            <a href="#how-it-works">How it works</a>
            <a href="#why-shadematch">Why ShadeMatch</a>
            <Button to="/login" variant="ghost" className={styles.footerLinkButton}>
              Log in
            </Button>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>&copy; {new Date().getFullYear()} ShadeMatch. All rights reserved.</span>
          <span>Built for makeup artists.</span>
        </div>
      </footer>
    </div>
  )
}

export default Landing
