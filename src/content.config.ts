import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const GROUPS = ['pi', 'postdoc', 'grad', 'staff', 'former'] as const;

const people = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/people' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string().default(''),
      affiliation: z.array(z.string()).default([]),
      location: z.string().default(''),
      email: z.string().default(''),
      photo: image().optional(),
      groups: z.array(z.enum(GROUPS)).default([]),
      labs: z.array(z.string()).default([]),
      contact: z.array(z.string()).default([]),
    }),
});

const link = z.object({ label: z.string(), href: z.string() });

const publications = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/publications' }),
  schema: z.object({
    year: z.number(),
    entries: z.array(
      z.object({
        authors: z.string().default(''),
        title: z.string(),
        citation: z.string().default(''),
        doi: z.string().default(''),
        pdf: z.string().optional(),
        links: z.array(link).default([]),
      }),
    ),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/pages' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string().optional(),
      description: z.string().default(''),
      navGroup: z.string().optional(),
      hero: image().optional(),
      heroCaption: z.string().optional(),
      retiredTool: z.boolean().default(false),
      cards: z
        .array(
          z.object({
            title: z.string(),
            href: z.string(),
            text: z.string().default(''),
            image: image().optional(),
          }),
        )
        .default([]),
      gallery: z.array(image()).default([]),
    }),
});

const faqs = defineCollection({
  loader: file('./src/content/faqs.yaml'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    question: z.string(),
    answer: z.string(),
  }),
});

const glossary = defineCollection({
  loader: file('./src/content/glossary.yaml'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    term: z.string(),
    definition: z.string(),
  }),
});

export const collections = { people, publications, pages, faqs, glossary };
