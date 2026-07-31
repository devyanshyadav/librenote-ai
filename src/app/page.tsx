import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/utils/auth-helpers";

export default async function IndexPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/notebook");
  }

  redirect("/auth");
}

