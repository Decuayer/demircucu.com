"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Code2 } from "lucide-react";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { deleteProject } from "@/app/actions/admin";
import { Project } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getTranslated } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";

interface AdminProjectsClientProps {
  initialProjects: Project[];
}

export default function AdminProjectsClient({ initialProjects }: AdminProjectsClientProps) {
  const t = useTranslations("admin");
  const params = useParams();
  const locale = params.locale as string;

  const [projects, setProjects] = useState(initialProjects);
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deleteProject(deleteId);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Proje silindi.");
        setProjects((prev) => prev.filter((p) => p.id !== deleteId));
      }
      setDeleteId(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold flex items-center gap-3"
        >
          <Code2 className="h-6 w-6 text-cyan-400" />
          {t("projects")}
        </motion.h1>
        <Link href="/admin/projects/new">
          <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
            <Plus className="mr-2 h-4 w-4" />
            {t("add") || "Ekle"}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/50 bg-card/50 hover:bg-card transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{getTranslated(project, "title", locale)}</h3>
                  <div className="flex gap-1">
                    <Link href={`/admin/projects/${project.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(project.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={project.published ? "default" : "secondary"} className="text-xs">
                    {project.published ? t("published") : t("unpublished")}
                  </Badge>
                  {project.featured && (
                    <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">
                      {t("featured")}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border-border/50 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
              {isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
