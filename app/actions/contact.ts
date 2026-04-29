"use server";

import { prisma } from "@/lib/prisma";

export async function submitContactMessage(data: any) {
  const { name, email, subject, message } = data;

  if (!name || !email || !message) {
    return { error: "Lütfen gerekli tüm alanları doldurun." };
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
    return { error: "Mesajınız gönderilirken bir hata oluştu." };
  }
}
