/**
 * Home page grid for featured projects, chosen by how many there are so no column stays empty:
 * 1 = one wide horizontal card, 2 = two columns, 3 = three columns, 4 = two by two.
 */
export const MAX_FEATURED_PROJECTS = 4;

export type ProjectGrid = "single" | "two" | "three";

export function projectGrid(count: number): ProjectGrid {
  if (count <= 1) return "single";
  if (count === 3) return "three";
  return "two";
}
