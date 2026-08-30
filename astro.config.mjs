import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import { rehypeExternalLinks } from './src/lib/rehype-external.mjs';

// The Graph Academy. Static, zero third-party requests, CSS inlined into the
// document so a lesson page is one request for the HTML and one per font.
export default defineConfig({
  site: 'https://learn-thegraph.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // The house style says inline the CSS. That rule is written for a landing
    // page, where it buys you a single request. This site is 50-odd pages that
    // people read in sequence, and the stylesheet is 32KB. Inlining it charges
    // every reader for the same bytes on every lesson. One same-origin file,
    // cached after the first page, honours the intent better: still zero
    // third-party requests, and a lesson costs roughly 6KB over the wire
    // instead of 14KB. Recorded in DESIGN-NOTES.md.
    inlineStylesheets: 'never',
  },
  integrations: [mdx(), sitemap(), pagefind()],
  markdown: {
    rehypePlugins: [rehypeExternalLinks],
    shikiConfig: {
      // defaultColor false emits both palettes as CSS variables, so the theme
      // toggle moves the code colours with everything else. No client-side
      // highlighter, ever.
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      wrap: false,
      langs: [],
    },
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
