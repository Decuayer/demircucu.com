import { adminListTagOptions } from "@/lib/data/admin";
import ExperienceFormClient from "../form-client";

export default async function NewExperiencePage() {
  const tagOptions = await adminListTagOptions();
  return (
    <div className="container mx-auto px-4 py-8">
      <ExperienceFormClient tagOptions={tagOptions} />
    </div>
  );
}
