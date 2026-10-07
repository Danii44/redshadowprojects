import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

type CreateUserBody = {
  action?: "reset-password" | "update-member";
  profileId?: string;
  name: string;
  email: string;
  role: "admin" | "project_leader" | "team_member";
  active?: boolean;
};

type DeleteUserBody = { profileId: string };

function generateTempPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const bytes = crypto.randomBytes(12);
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !publicKey || !serviceKey) {
    return NextResponse.json(
      { error: "Server user creation is not configured." },
      { status: 503 },
    );
  }

  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const publicClient = createClient(url, publicKey);
  const { data: authData } = await publicClient.auth.getUser(token);
  if (!authData.user)
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await adminClient
    .from("users")
    .select("role")
    .eq("auth_user_id", authData.user.id)
    .single();

  if (profile?.role !== "admin")
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );

  const body = (await request.json()) as Partial<CreateUserBody>;

  if (body.action === "update-member") {
    const profileId = body.profileId?.trim();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role;

    if (
      !profileId ||
      !name ||
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !role ||
      !["admin", "project_leader", "team_member"].includes(role) ||
      typeof body.active !== "boolean"
    ) {
      return NextResponse.json(
        { error: "A valid name, email, role, account status, and profile are required." },
        { status: 400 },
      );
    }

    const { data: member, error: memberError } = await adminClient
      .from("users")
      .select("id, name, email, role, active, auth_user_id")
      .eq("id", profileId)
      .single();

    if (memberError || !member)
      return NextResponse.json({ error: "Member not found." }, { status: 404 });

    const { data: matchingProfile, error: duplicateLookupError } =
      await adminClient
        .from("users")
        .select("id")
        .eq("email", email)
        .neq("id", profileId)
        .maybeSingle();

    if (duplicateLookupError)
      return NextResponse.json(
        { error: duplicateLookupError.message },
        { status: 500 },
      );
    if (matchingProfile)
      return NextResponse.json(
        { error: "Another member already uses this email address." },
        { status: 409 },
      );

    const { error: profileError } = await adminClient
      .from("users")
      .update({
        name,
        email,
        role,
        active: body.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 });

    if (member.auth_user_id) {
      const { data: authMember, error: authLookupError } =
        await adminClient.auth.admin.getUserById(member.auth_user_id);

      if (authLookupError || !authMember.user) {
        const { error: rollbackError } = await adminClient
          .from("users")
          .update({
            name: member.name,
            email: member.email,
            role: member.role,
            active: member.active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileId);
        return NextResponse.json(
          {
            error: rollbackError
              ? `Could not find the member login (${authLookupError?.message || "Member login not found."}); profile rollback also failed (${rollbackError.message}).`
              : authLookupError?.message || "Member login not found.",
          },
          { status: 400 },
        );
      }

      const { error: authUpdateError } =
        await adminClient.auth.admin.updateUserById(member.auth_user_id, {
          email,
          email_confirm: true,
          user_metadata: { ...authMember.user.user_metadata, name },
        });

      if (authUpdateError) {
        const { error: rollbackError } = await adminClient
          .from("users")
          .update({
            name: member.name,
            email: member.email,
            role: member.role,
            active: member.active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileId);

        return NextResponse.json(
          {
            error: rollbackError
              ? `Could not update the login email (${authUpdateError.message}); profile rollback also failed (${rollbackError.message}).`
              : authUpdateError.message,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ success: true });
  }

  if (body.action === "reset-password") {
    if (!body.profileId)
      return NextResponse.json(
        { error: "A user profile is required." },
        { status: 400 },
      );

    const { data: member } = await adminClient
      .from("users")
      .select("id, name, email, auth_user_id, active")
      .eq("id", body.profileId)
      .single();

    if (!member)
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    if (!member.active || !member.auth_user_id)
      return NextResponse.json(
        { error: "This member does not have an active login." },
        { status: 400 },
      );

    const tempPassword = "#RSD2026";
    const { error } = await adminClient.auth.admin.updateUserById(
      member.auth_user_id,
      { password: tempPassword },
    );

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      name: member.name,
      email: member.email,
      tempPassword,
    });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const role = body.role;

  if (
    !name ||
    !email ||
    !role ||
    !["admin", "project_leader", "team_member"].includes(role)
  ) {
    return NextResponse.json(
      { error: "Name, email, and a valid role are required." },
      { status: 400 },
    );
  }

  const tempPassword = generateTempPassword();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name, must_change_password: true },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: existingProfile } = await adminClient
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const profileWrite = existingProfile
    ? adminClient
        .from("users")
        .update({
          auth_user_id: data.user.id,
          name,
          role,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id)
    : adminClient.from("users").insert({
        auth_user_id: data.user.id,
        email,
        name,
        role,
        active: true,
      });

  const { error: profileError } = await profileWrite;
  if (profileError) {
    await adminClient.auth.admin.deleteUser(data.user.id);
    return NextResponse.json(
      {
        error: `User was not linked to a company profile: ${profileError.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.user.id,
    email,
    role,
    tempPassword,
  });
}

export async function DELETE(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !publicKey || !serviceKey)
    return NextResponse.json(
      { error: "Server user management is not configured." },
      { status: 503 },
    );

  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const publicClient = createClient(url, publicKey);
  const { data: authData } = await publicClient.auth.getUser(token);
  if (!authData.user)
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminProfile } = await adminClient
    .from("users")
    .select("id, role")
    .eq("auth_user_id", authData.user.id)
    .single();

  if (adminProfile?.role !== "admin")
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );

  const { profileId } = (await request.json()) as DeleteUserBody;

  // Prevent self-deletion
  if (profileId === adminProfile.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  const { data: member } = await adminClient
    .from("users")
    .select("id, name, auth_user_id")
    .eq("id", profileId)
    .single();

  if (!member)
    return NextResponse.json({ error: "Member not found." }, { status: 404 });

  // Protected IDs check via env var or core account protection
  const protectedIds = (process.env.PROTECTED_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (
    protectedIds.includes(member.id) ||
    protectedIds.includes(member.auth_user_id ?? "")
  ) {
    return NextResponse.json(
      { error: "Core company accounts cannot be removed." },
      { status: 400 },
    );
  }

  await Promise.all([
    adminClient.from("team_members").delete().eq("user_id", profileId),
    adminClient.from("project_members").delete().eq("user_id", profileId),
    adminClient.from("tasks").update({ assignee_id: null }).eq("assignee_id", profileId),
    adminClient.from("tasks").update({ reviewer_id: null }).eq("reviewer_id", profileId),
    adminClient.from("teams").update({ leader_id: null }).eq("leader_id", profileId),
  ]);

  if (member.auth_user_id)
    await adminClient.auth.admin.deleteUser(member.auth_user_id);

  const { error } = await adminClient
    .from("users")
    .update({ active: false, auth_user_id: null })
    .eq("id", profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
