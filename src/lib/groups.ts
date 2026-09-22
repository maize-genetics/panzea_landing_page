import labsData from '../data/labs.json';

/** Role-based roster pages, keyed by the slug the old site used. */
export const ROLE_PAGES = [
  { slug: 'pis', group: 'pi', title: 'Principal Investigators' },
  { slug: 'post-docs', group: 'postdoc', title: 'Postdoctoral Associates' },
  { slug: 'grad-students', group: 'grad', title: 'Graduate Students' },
  { slug: 'staff', group: 'staff', title: 'Staff' },
  { slug: 'former-people', group: 'former', title: 'Former Project Members' },
] as const;

export const LABS = labsData.labs;

/** Lab members who never had a bio page, so only their name is known. */
export const LAB_EXTRAS = labsData.extraMembers as Record<string, string[]>;
