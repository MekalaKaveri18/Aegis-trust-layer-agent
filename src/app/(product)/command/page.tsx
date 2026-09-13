import { CommandCenter } from "@/components/command-center";
import { getCurrentUser } from "@/lib/auth/session";

export default async function CommandPage() {
  const user = await getCurrentUser();
  const firstName = user?.name.split(" ")[0] || "there";
  return <CommandCenter firstName={firstName} />;
}
