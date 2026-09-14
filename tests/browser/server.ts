/** Loopback-only synthetic Supabase protocol fixture. Never deploy this server. */
import { parseAnswers, applicationErrors, profileRequirements, APPLICATION_ROUND, type CoreTeamApplication } from '../../src/lib/core-team';
import type { Member } from '../../src/types/database';
import http from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
const HOST = "127.0.0.1",
  PORT = Number(process.env.DW_TEST_DB_PORT || 54329),
  APP = `http://localhost:${process.env.DW_TEST_APP_PORT || 3100}`;
const id = "11111111-1111-4111-8111-111111111111";
const user = {
  id,
  aud: "authenticated",
  role: "authenticated",
  email: "session-fixture@uwaterloo.ca",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  app_metadata: { design_waterloo_role: null as string | null, provider: "azure", providers: ["azure"] },
  user_metadata: { full_name: "Session Fixture" },
};
const original = {
  id: "22222222-2222-4222-8222-222222222222",
  auth_user_id: id,
  member_id: 1,
  first_name: "Session",
  last_name: "Fixture",
  slug: "session-fixture",
  school_email: user.email,
  school: "University of Waterloo",
  program: "Computer Science",
  graduating_class: "2027",
  bio: "Synthetic browser test profile.",
  public_email: null,
  profile_image_url: null,
  profile_image_path: null,
  specialties: [],
  work_schedule: [],
  onboarding_completed: true,
  slug_confirmed: true,
  is_approved: true,
  is_admin: false,
  review_status: "approved",
  member_experiences: [],
  member_leadership: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
const handles = new Set([original.slug]);
let member = { ...original },
  failUser = false,
  failMember = false,
  failSave = false,
  refreshes = 0,
  exchanges = 0,
  saves = 0;
let deletions = 0, failDelete = false;
const codes = new Map<string, string>(),
  tokens = new Set<string>(),
  refresh = new Set<string>();
const jwt = (payload: object) =>
  [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "synthetic-test-signature",
  ].join(".");
function session() {
  const now = Math.floor(Date.now() / 1000),
    access = jwt({
      sub: id,
      aud: "authenticated",
      role: "authenticated",
      exp: now + 3600,
      iat: now,
      jti: randomUUID(),
    }),
    renew = randomUUID();
  tokens.add(access);
  refresh.add(renew);
  return {
    access_token: access,
    refresh_token: renew,
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
    user,
  };
}
let coreApplication: CoreTeamApplication | null = null;
let coreDelay = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://${HOST}:${PORT}`);
  const allowedOrigins = [APP, `http://127.0.0.1:${new URL(APP).port}`];
  res.setHeader("Access-Control-Allow-Origin", allowedOrigins.includes(req.headers.origin ?? "") ? req.headers.origin! : APP);
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer, range, accept-profile, content-profile",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,HEAD,OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "content-range");
  const send = (data: unknown, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  let body: Record<string, unknown> = {};
  if (["POST", "PATCH"].includes(req.method!)) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      send({ error: "invalid JSON" }, 400);
      return;
    }
  }
  if (url.pathname === "/__control") {
    if (body.reset) {
      member = { ...original };
      coreApplication = null; coreDelay = 0;
      deletions = 0; failDelete = false; user.app_metadata.design_waterloo_role = null;
      handles.clear(); handles.add(original.slug);
      failUser = false;
      failMember = false;
      failSave = false;
      refreshes = 0;
      exchanges = 0;
      saves = 0;

      codes.clear();
      tokens.clear();
      refresh.clear();
    }
    if ("coreDelay" in body) coreDelay = Number(body.coreDelay);
    if ("staffRole" in body) user.app_metadata.design_waterloo_role = body.staffRole as string | null;
    if ("failDelete" in body) failDelete = Boolean(body.failDelete);
    if ("failUser" in body) failUser = Boolean(body.failUser);
    if ("failMember" in body) failMember = Boolean(body.failMember);
    if ("failSave" in body) failSave = Boolean(body.failSave);
    if (body.member) member = { ...member, ...(body.member as object) };
    send({ refreshes, exchanges, saves, member, deletions, coreApplication });
    return;
  }
  if (url.pathname === "/auth/v1/authorize") {
    const destination = url.searchParams.get("redirect_to");
    if (
      !([`${APP}/auth/callback`, `http://127.0.0.1:${new URL(APP).port}/auth/callback`].includes(destination ?? "")) ||
      url.searchParams.get("provider") !== "azure"
    ) {
      send({ error: "unexpected OAuth destination" }, 400);
      return;
    }
    const code = randomUUID();
    codes.set(code, url.searchParams.get("code_challenge") ?? "");
    res.writeHead(302, { Location: `${destination}?code=${code}` });
    res.end();
    return;
  }
  if (url.pathname === "/auth/v1/token") {
    if (url.searchParams.get("grant_type") === "pkce") {
      const code = String(body.auth_code),
        expected = codes.get(code),
        actual = createHash("sha256")
          .update(String(body.code_verifier))
          .digest("base64url");
      if (!expected || expected !== actual) {
        send({ code: "bad_code_verifier", msg: "Invalid PKCE exchange" }, 400);
        return;
      }
      codes.delete(code);
      exchanges++;
    } else {
      const token = String(body.refresh_token);
      if (!refresh.delete(token)) {
        send(
          { code: "refresh_token_already_used", msg: "Invalid refresh" },
          400,
        );
        return;
      }
      refreshes++;
    }
    send(session());
    return;
  }
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (url.pathname === `/auth/v1/admin/users/${id}` && req.method === 'DELETE') {
    if (token !== 'synthetic-service-key') { send({message:'Forbidden'},403); return; }
    if (failDelete) { send({message:'Synthetic deletion outage'},503); return; }
    deletions++; tokens.clear(); refresh.clear();
    send({user}); return;
  }
  if (url.pathname === "/auth/v1/user") {
    if (failUser) {
      send({ msg: "Synthetic auth outage" }, 503);
      return;
    }
    if (!token || !tokens.has(token)) {
      send({ code: "session_not_found", msg: "No session" }, 401);
      return;
    }
    send(user);
    return;
  }
  if (url.pathname === "/auth/v1/logout") {
    if (token) tokens.delete(token);
    res.writeHead(204);
    res.end();
    return;
  }
  if (url.pathname === "/rest/v1/rpc/resolve_username") {
    if (failMember) { send({ message: "Synthetic profile outage" }, 503); return; }
    send(handles.has(String(body.requested_username).toLowerCase()) ? member.slug : null);
    return;
  }
  if (url.pathname === "/rest/v1/rpc/username_available") {
    send(String(body.candidate) !== "taken-name"); return;
  }
  if (url.pathname === "/rest/v1/rpc/change_my_username") {
    if (!token || !tokens.has(token)) { send({ message: "No session" }, 401); return; }
    if (body.expected_username !== member.slug) { send({ code: "40001" }, 409); return; }
    if (body.new_username === "taken-name") { send({ code: "23505" }, 409); return; }
    member = { ...member, slug: String(body.new_username) };
    handles.add(member.slug);
    send(member.slug); return;
  }
  if (url.pathname === "/rest/v1/rpc/ensure_member") {
    send({ outcome: "linked", slug: member.slug, onboardingCompleted: member.onboarding_completed });
    return;
  }
  if (url.pathname === "/rest/v1/member_experiences") { send(member.member_experiences); return; }
  if (url.pathname === "/rest/v1/rpc/save_my_experiences") {
    if (!token || !tokens.has(token)) { send({message:"No session"},401); return; }
    if (failSave) { send({message:"Synthetic save outage"},503); return; }
    member = {...member, member_experiences: body.experiences as []}; saves++; send(null); return;
  }
  if (url.pathname === "/rest/v1/core_team_applications") {
    if (!token || !tokens.has(token)) { send({ message: "No session" }, 401); return; }
    const visible = coreApplication && (!url.searchParams.get('status') || url.searchParams.get('status') === `eq.${coreApplication.status}`);
    send(req.headers.accept?.includes('application/vnd.pgrst.object') ? visible ? coreApplication : null : visible ? [coreApplication] : []); return;
  }
  if (url.pathname === "/rest/v1/rpc/save_core_team_application") {
    if (!token || !tokens.has(token)) { send({ message: 'No session', code: '42501' }, 401); return; }
    if (coreDelay) await new Promise(resolve => setTimeout(resolve, coreDelay));
    if (failSave) { send({ message: 'Synthetic outage' }, 503); return; }
    const answers = parseAnswers(body.draft_answers);
    const submit = body.submit_application === true;
    if (!answers) { send({ message: 'Invalid answers', code: '23514' }, 400); return; }
    if (coreApplication && JSON.stringify(coreApplication.answers) === JSON.stringify(answers) && (!submit || coreApplication.status === 'submitted')) { send(coreApplication); return; }
    if (coreApplication?.status === 'submitted') { send({message:'Already submitted',code:'55000'},400);return; }
    if ((coreApplication?.revision ?? 0) !== body.expected_revision) { send({message:'Conflict',code:'40001'},409);return; }
    if (submit && (Object.keys(applicationErrors(answers)).length || profileRequirements(member as unknown as Member).some(r=>!r.complete))) { send({message:'Incomplete',code:'23514'},400);return; }
    coreApplication = {id:coreApplication?.id ?? randomUUID(),member_id:member.id,round:APPLICATION_ROUND,answers,revision:(coreApplication?.revision??0)+1,status:submit?'submitted':'draft',created_at:coreApplication?.created_at??new Date().toISOString(),updated_at:new Date().toISOString(),submitted_at:submit?new Date().toISOString():null,profile_snapshot:submit?JSON.parse(JSON.stringify(member)):null};
    send(coreApplication);return;
  }
  if (url.pathname === "/rest/v1/rpc/save_my_profile") {
    if (failSave) { send({message:"Synthetic save outage"},503); return; }
    if (!token || !tokens.has(token)) {
      send({ message: "No session" }, 401);
      return;
    }
    member = { ...member, ...(body.profile as object), member_experiences: ((body.experiences || member.member_experiences) as Record<string, unknown>[]).map(position => Object.fromEntries(Object.entries(position).filter(([key]) => key !== "logo_preview"))) as [], member_leadership: (body.leadership || member.member_leadership) as [] };
    saves++;
    send(null);
    return;
  }
  if (url.pathname === "/rest/v1/members") {
    if (failMember) {
      send({ message: "Synthetic profile outage" }, 503);
      return;
    }
    res.setHeader("Content-Range", "0-0/1");
    if (req.method === "HEAD") {
      res.writeHead(200);
      res.end();
      return;
    }
    if (req.method === "PATCH") {
      if (failSave) { send({ message: "Synthetic save outage" }, 503); return; }
      if (!token || (!tokens.has(token) && token !== "synthetic-service-key")) {
        send({ message: "No session" }, 401);
        return;
      }
      const expectedStatus = url.searchParams.get("review_status");
      if (expectedStatus && expectedStatus !== `eq.${member.review_status}`) { send(req.headers.accept?.includes("application/vnd.pgrst.object") ? null : []); return; }
      member = { ...member, ...body };
      saves++;
      handles.add(member.slug);
      send(req.headers.accept?.includes("application/vnd.pgrst.object") ? member : [member]);
      return;
    }
    const slug = url.searchParams.get("slug"),
      auth = url.searchParams.get("auth_user_id");
    const matches =
      (!slug || slug === `eq.${member.slug}`) && (!auth || auth === `eq.${id}`);
    send(
      req.headers.accept?.includes("application/vnd.pgrst.object")
        ? matches
          ? member
          : null
        : matches
          ? [member]
          : [],
    );
    return;
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    send([]);
    return;
  }
  send({ error: "Unknown fixture route" }, 404);
});
server.listen(PORT, HOST, () => {
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      HOST,
      "--port",
      String(new URL(APP).port),
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_BUILD_DIR: process.env.NEXT_BUILD_DIR || ".next-e2e",
        NEXT_PUBLIC_SUPABASE_URL: `http://${HOST}:${PORT}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key",
        TEST_LOGIN_ENABLED: "false",
        NEXT_TELEMETRY_DISABLED: "1",
        SANITY_API_TOKEN: "",
        NEXT_PUBLIC_SANITY_PROJECT_ID: "synthetic",
        NEXT_PUBLIC_SANITY_DATASET: "production",
      },
    },
  );
  const stop = () => {
    child.kill("SIGTERM");
    server.close();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  child.on("exit", (code) => {
    server.close();
    process.exitCode = code ?? 0;
  });
});
