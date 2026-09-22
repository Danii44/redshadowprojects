import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type CreateUserBody = { name: string; email: string; role: "admin" | "project_leader" | "team_member" };
type DeleteUserBody = { profileId: string };

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serviceKey) {
    return NextResponse.json({ error: "Server user creation is not configured." }, { status: 503 });
  }
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const publicClient = createClient(url, publicKey);
  const { data: authData } = await publicClient.auth.getUser(token);
  if (!authData.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  const adminClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profile } = await adminClient.from("users").select("role").eq("auth_user_id", authData.user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { name, email, role } = (await request.json()) as CreateUserBody;
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: "#RSD2026",
    email_confirm: true,
    user_metadata: { name, must_change_password: true },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await adminClient.from("users").update({ name, role, active: true }).eq("auth_user_id", data.user.id);
  return NextResponse.json({ id: data.user.id });
}

export async function DELETE(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serviceKey) return NextResponse.json({ error: "Server user management is not configured." }, { status: 503 });
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const publicClient = createClient(url, publicKey);
  const { data: authData } = await publicClient.auth.getUser(token);
  if (!authData.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  const adminClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: adminProfile } = await adminClient.from("users").select("role").eq("auth_user_id", authData.user.id).single();
  if (adminProfile?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { profileId } = (await request.json()) as DeleteUserBody;
  const { data: member } = await adminClient.from("users").select("id,name,auth_user_id").eq("id", profileId).single();
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  if (["Daniyal Ahmad", "Ahmad Shujaat"].includes(member.name)) return NextResponse.json({ error: "Core company accounts cannot be removed." }, { status: 400 });
  await Promise.all([
    adminClient.from("team_members").delete().eq("user_id", profileId),
    adminClient.from("project_members").delete().eq("user_id", profileId),
    adminClient.from("tasks").update({ assignee_id: null }).eq("assignee_id", profileId),
    adminClient.from("tasks").update({ reviewer_id: null }).eq("reviewer_id", profileId),
    adminClient.from("teams").update({ leader_id: null }).eq("leader_id", profileId),
  ]);
  if (member.auth_user_id) await adminClient.auth.admin.deleteUser(member.auth_user_id);
  const { error } = await adminClient.from("users").update({ active: false, auth_user_id: null }).eq("id", profileId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

