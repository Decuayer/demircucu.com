"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, GripVertical, Briefcase } from "lucide-react";
import { getTranslated } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { deleteExperience } from "@/app/actions/admin";
import { Experience } from "@prisma/client";
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

interface AdminExperiencesClientProps {
  initialExperiences: Experience[];
}

export default function AdminExperiencesClient({ initialExperiences }: AdminExperiencesClientProps) {
  const t = useTranslations("admin");
  const params = useParams();
  const locale = params.locale as string;
  const [experiences, setExperiences] = useState(initialExperiences);
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deleteExperience(deleteId);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Deneyim silindi.");
        setExperiences((prev) => prev.filter((e) => e.id !== deleteId));
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
          <Briefcase className="h-6 w-6 text-violet-400" />
          {t("experiences")}
        </motion.h1>
        <Link href="/admin/experiences/new">
          <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
            <Plus className="mr-2 h-4 w-4" />
            {t("add") || "Ekle"}
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {experiences.map((exp, i) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/50 bg-card/50 hover:bg-card transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <div>
                    <p className="font-medium">{exp.company}</p>
                    <p className="text-sm text-muted-foreground">{getTranslated(exp, "position", locale)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={exp.published ? "default" : "secondary"} className="text-xs">
                    {exp.published ? t("published") : t("unpublished")}
                  </Badge>
                  <Link href={`/admin/experiences/${exp.id}/edit`}>
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(exp.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border-border/50 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteExperienceConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
