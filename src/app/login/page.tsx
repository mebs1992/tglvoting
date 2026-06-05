import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getMembers } from "@/app/actions/auth-actions";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const members = await getMembers();

  return <LoginForm members={members} />;
}
