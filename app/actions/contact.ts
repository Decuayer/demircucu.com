"use server";

import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export async function submitContactMessage(data: any) {
  const t = await getTranslations("contact");
  const { name, email, subject, message } = data;

  if (!name || !email || !message) {
    return { error: t("requiredFields") };
  }

  try {
    await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Contact submission error:", error);
    return { error: t("submissionError") };
  }
}
