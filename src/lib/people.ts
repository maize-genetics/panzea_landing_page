import { getCollection, type CollectionEntry } from 'astro:content';

export type Person = CollectionEntry<'people'>;

/** Directory order on the old site was alphabetical by first name. */
export async function allPeople(): Promise<Person[]> {
  const people = await getCollection('people');
  return people.sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function peopleInGroup(group: string): Promise<Person[]> {
  return (await allPeople()).filter((p) => p.data.groups.includes(group as never));
}

export async function peopleInLab(lab: string): Promise<Person[]> {
  return (await allPeople()).filter((p) => p.data.labs.includes(lab));
}
