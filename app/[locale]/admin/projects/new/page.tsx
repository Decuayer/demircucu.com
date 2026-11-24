import { adminListTagOptions } from "@/lib/data/admin";
import ProjectFormClient from "../form-client";

export default async function NewProjectPage() {
  const tagOptions = await adminListTagOptions();
  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectFormClient tagOptions={tagOptions} />
    </div>
  );
}
