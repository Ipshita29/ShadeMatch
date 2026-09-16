// `brandSlug` links each product to a brand in brands.js — resolved to a
// real ObjectId at seed time, not stored as a string reference.
module.exports = [
  {
    brandSlug: 'mac',
    name: 'Studio Fix Fluid',
    slug: 'studio-fix-fluid',
    finish: 'Matte',
    coverage: 'Medium to Full',
    description: 'Long-wearing matte foundation with buildable coverage.',
  },
  {
    brandSlug: 'maybelline',
    name: 'Fit Me Matte + Poreless',
    slug: 'fit-me-matte-poreless',
    finish: 'Matte',
    coverage: 'Medium',
    description: 'Foundation formulated for normal-to-oily skin.',
  },
  {
    brandSlug: 'nars',
    name: 'Light Reflecting',
    slug: 'light-reflecting',
    finish: 'Natural',
    coverage: 'Light to Medium',
    description: 'Skin-perfecting foundation with light-diffusing pigments.',
  },
  {
    brandSlug: 'fenty-beauty',
    name: "Pro Filt'r Soft Matte",
    slug: 'pro-filtr-soft-matte',
    finish: 'Matte',
    coverage: 'Medium to Full',
    description: 'Longwear foundation available across an extensive shade range.',
  },
  {
    brandSlug: 'estee-lauder',
    name: 'Double Wear',
    slug: 'double-wear',
    finish: 'Matte',
    coverage: 'Full',
    description: '24-hour wear foundation.',
  },
];
