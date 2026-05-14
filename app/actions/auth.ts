"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function signUp(data: any) {
  const t = await getTranslations("auth");

  const { email, password, name } = data;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return { error: authError.message };
  }

  if (authData.user) {
    // 2. Create user profile in Prisma Database
    try {
      await prisma.profile.create({
        data: {
          id: authData.user.id, // Linking Supabase Auth ID with Prisma Profile ID
          email: authData.user.email!,
          name: name,
          role: "USER",
        },
      });
      return { success: true };
    } catch (dbError) {
      console.error("Profile creation error:", dbError);
      return { error: t("profileCreationError") || "Profil oluşturulurken bir hata oluştu." };
    }
  }

  return { error: t("unknownError") || "Bilinmeyen bir hata oluştu." };
}

export async function signIn(data: any) {
  const t = await getTranslations("auth");
  
  const { email, password } = data;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: t("invalidCredentials") || "E-posta veya şifre hatalı." };
  }

  return { success: true };
}

export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/");
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Fetch full profile from Prisma
  const profile = await prisma.profile.findUnique({
    where: { id: user.id }
  });

  return profile;
}

export async function updateProfile(data: { name: string }) {  
  const t = await getTranslations("auth");
  
  const user = await getCurrentUser();
  if (!user) return { error: t("unauthorized") || "Yetkisiz işlem." };

  try {
    await prisma.profile.update({
      where: { id: user.id },
      data: { name: data.name },
    });
    return { success: true };
  } catch (e) {
    return { error: t("profileUpdateError") || "Profil güncellenemedi." };
  }
}

export async function updatePassword(password: string) {
  const t = await getTranslations("auth");
  
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: t("passwordUpdateError") || "Şifre güncellenemedi." };
  }
  return { success: true };
}
