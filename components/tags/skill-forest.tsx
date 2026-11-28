import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { badgeVariants } from "@/components/ui/badge";
import { tagLabel } from "@/lib/tags/view";
import { cn } from "@/lib/utils";
import type { SkillCounts, SkillForest, SkillNode } from "@/lib/tags/tree";

/** "3 projects · 1 experience" (only non-zero parts). */
export function useCountsLabel(): (counts: SkillCounts) => string {
  const t = useTranslations("skills");
  return (counts) =>
    [
      counts.projects && t("projectsCount", { count: counts.projects }),
      counts.experiences && t("experiencesCount", { count: counts.experiences }),
      counts.posts && t("postsCount", { count: counts.posts }),
    ]
      .filter(Boolean)
      .join(" · ");
}

function SkillChip({ node, locale }: { node: SkillNode; locale: string }) {
  const countsLabel = useCountsLabel();
  const label = countsLabel(node.counts);
  return (
    <Link
      href={`/skills/${node.slug}`}
      title={label || undefined}
      className={cn(badgeVariants({ variant: "secondary" }), "gap-2 bg-accent/50 hover:bg-accent")}
    >
      {tagLabel(node, locale)}
      {label && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {node.counts.projects + node.counts.experiences + node.counts.posts}
        </span>
      )}
    </Link>
  );
}

/** Sibling skills: leaves render as chips, skills with children as indented groups. */
function SkillGroup({ nodes, locale }: { nodes: SkillNode[]; locale: string }) {
  const leaves = nodes.filter((c) => c.children.length === 0);
  const groups = nodes.filter((c) => c.children.length > 0);
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2">
        {leaves.map((child) => (
          <li key={child.id}>
            <SkillChip node={child} locale={locale} />
          </li>
        ))}
      </ul>
      {groups.map((group) => (
        <div key={group.id} className="space-y-2 border-l border-border/50 pl-3">
          <SkillChip node={group} locale={locale} />
          <SkillGroup nodes={group.children} locale={locale} />
        </div>
      ))}
    </div>
  );
}

/** Skill categories as titled sections (About and /skills). */
export function SkillForestView({
  forest,
  locale,
  headingLevel = "h2",
}: {
  forest: SkillForest;
  locale: string;
  headingLevel?: "h2" | "h3";
}) {
  const t = useTranslations("skills");
  const Heading = headingLevel;
  const sections = [
    ...forest.categories.map((c) => ({
      id: c.id,
      title: tagLabel(c, locale),
      slug: c.slug as string | null,
      nodes: c.children,
    })),
    ...(forest.uncategorized.length > 0
      ? [
          {
            id: "uncategorized",
            title: t("uncategorized"),
            slug: null,
            nodes: forest.uncategorized,
          },
        ]
      : []),
  ];
  if (sections.length === 0) return <p className="text-muted-foreground">{t("empty")}</p>;
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <Heading className="text-h4">
            {section.slug ? (
              <Link href={`/skills/${section.slug}`} className="hover:underline">
                {section.title}
              </Link>
            ) : (
              section.title
            )}
          </Heading>
          <SkillGroup nodes={section.nodes} locale={locale} />
        </section>
      ))}
    </div>
  );
}
