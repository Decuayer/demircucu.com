import { adminListExperiences } from "@/lib/data/admin";
import AdminExperiencesClient from "./client";

export default async function AdminExperiencesPage() {
  return <AdminExperiencesClient initialExperiences={await adminListExperiences()} />;
}
