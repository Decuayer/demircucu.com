"use client";

import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteContactMessage, setContactMessageRead } from "@/app/actions/admin";
import { type ContactMessage } from "@prisma/client";
import { Trash2 } from "lucide-react";
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

interface AdminContactsClientProps {
  initialMessages: ContactMessage[];
}

export default function AdminContactsClient({ initialMessages }: AdminContactsClientProps) {
  const t = useTranslations("admin");
  const errorMessage = useActionErrorMessage();
  const [messages, setMessages] = useState(initialMessages);
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const markRead = (id: string, read: boolean) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read } : m)));
    void setContactMessageRead({ id, read }).then((res) => {
      if (res.error) toast.error(errorMessage(res.error));
    });
  };

  const toggle = (msg: ContactMessage) => {
    const opening = openId !== msg.id;
    setOpenId(opening ? msg.id : null);
    if (opening && !msg.read) markRead(msg.id, true);
  };

  // Links from the dashboard open one message: /admin/contacts#message-<id>.
  useEffect(() => {
    const match = /^#message-(.+)$/.exec(window.location.hash);
    const msg = match && initialMessages.find((m) => m.id === match[1]);
    if (!msg) return;
    // Opening a linked message mirrors a click; state is set once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenId(msg.id);
    if (!msg.read) {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)));
      void setContactMessageRead({ id: msg.id, read: true });
    }
    document.getElementById(`message-${msg.id}`)?.scrollIntoView({ block: "center" });
  }, [initialMessages]);

  const handleDelete = async () => {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deleteContactMessage(deleteId);
      if (res.error) toast.error(errorMessage(res.error));
      else {
        toast.success("Mesaj silindi.");
        setMessages((prev) => prev.filter((m) => m.id !== deleteId));
      }
      setDeleteId(null);
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="enter flex items-center gap-3 text-2xl font-bold">
        <Mail className="h-6 w-6 text-cyan-400" />
        {t("messages")}
      </h1>

      <div className="space-y-3">
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            id={`message-${msg.id}`}
            className="enter scroll-mt-24"
            style={{ "--enter-delay": `${i * 50}ms` } as React.CSSProperties}
          >
            <Card className="border-border/50 bg-card/50 transition-colors hover:bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    className="flex-1 space-y-1 text-left"
                    aria-expanded={openId === msg.id}
                    onClick={() => toggle(msg)}
                  >
                    <div className="flex items-center gap-2">
                      {!msg.read && (
                        <span
                          className="h-2 w-2 rounded-full bg-violet-500"
                          aria-label={t("unread")}
                        />
                      )}
                      <p className={`text-sm ${msg.read ? "font-medium" : "font-semibold"}`}>
                        {msg.name} ({msg.email})
                      </p>
                    </div>
                    <p className="text-sm font-medium">{msg.subject}</p>
                    <p
                      className={
                        openId === msg.id
                          ? "text-sm whitespace-pre-wrap text-muted-foreground"
                          : "line-clamp-1 text-xs text-muted-foreground"
                      }
                    >
                      {msg.message}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <time>{new Date(msg.createdAt).toLocaleDateString()}</time>
                    {msg.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => markRead(msg.id, false)}
                      >
                        {t("markUnread")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(msg.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border-border/50 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteContactConfirmation")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
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
