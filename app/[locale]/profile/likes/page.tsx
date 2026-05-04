import { getCurrentUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileLikesClient from "./client";

export default async function ProfileLikesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/en/auth/login");
  }

  // Fetch liked posts
  const likes = await prisma.like.findMany({
    where: { userId: user.id },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Fetch past comments
  const comments = await prisma.comment.findMany({
    where: { authorId: user.id },
    include: {
      post: {
        select: {
          title: true,
          slug: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return <ProfileLikesClient likes={likes} comments={comments} />;
}
