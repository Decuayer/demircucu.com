import HeaderClient from "./header-client";
import { getCurrentUser } from "@/app/actions/auth";

export default async function Header() {
  const user = await getCurrentUser();
  return <HeaderClient user={user} />;
}
