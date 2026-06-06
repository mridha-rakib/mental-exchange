/// <reference path="../pb_data/types.d.ts" />

const ACCOUNT_DEVICE_LIMIT = 3;
const ACCOUNT_DEVICE_SESSION_DAYS = 30;
const ACCOUNT_DEVICE_COLLECTION = "account_device_sessions";

const nowIso = () => new Date().toISOString();

const addDaysIso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const escapePbString = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const getHeader = (requestInfo, name) => {
  const headers = requestInfo?.headers || {};
  const lowerName = String(name || "").toLowerCase();
  return String(headers[name] || headers[lowerName] || headers[lowerName.replace(/^x-/, "X-")] || "").trim();
};

const getDeviceId = (requestInfo) => getHeader(requestInfo, "x-device-id").slice(0, 120);

const getClientIp = (requestInfo) => {
  const forwardedFor = getHeader(requestInfo, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim().slice(0, 80);
  }

  return getHeader(requestInfo, "x-real-ip").slice(0, 80);
};

const isSessionActive = (session, nowValue = Date.now()) => {
  if (!session?.get("is_active")) return false;
  if (String(session.get("revoked_at") || "").trim()) return false;

  const expiresAt = String(session.get("expires_at") || "").trim();
  if (!expiresAt) return true;

  const expiresTime = new Date(expiresAt).getTime();
  return Number.isNaN(expiresTime) || expiresTime > nowValue;
};

const deactivateSession = (session, revokedAt = nowIso()) => {
  session.set("is_active", false);
  session.set("revoked_at", revokedAt);
  $app.save(session);
};

const getUserDeviceSessions = (userId) => {
  try {
    return $app.findRecordsByFilter(
      ACCOUNT_DEVICE_COLLECTION,
      `user_id="${escapePbString(userId)}"`,
      "-last_seen_at",
      200,
      0,
    );
  } catch (error) {
    if (String(error.message || "").includes("no rows in result set")) {
      return [];
    }

    throw error;
  }
};

const findDeviceSession = (userId, deviceId) => {
  try {
    return $app.findFirstRecordByFilter(
      ACCOUNT_DEVICE_COLLECTION,
      `user_id="${escapePbString(userId)}" && device_id="${escapePbString(deviceId)}"`,
    );
  } catch (error) {
    if (String(error.message || "").includes("no rows in result set")) {
      return null;
    }

    throw error;
  }
};

const touchDeviceSession = ({ userId, deviceId, requestInfo }) => {
  const collection = $app.findCollectionByNameOrId(ACCOUNT_DEVICE_COLLECTION);
  let session = findDeviceSession(userId, deviceId);
  const currentTime = nowIso();

  if (!session) {
    session = new Record(collection);
    session.set("user_id", userId);
    session.set("device_id", deviceId);
  }

  session.set("device_label", getHeader(requestInfo, "x-device-label").slice(0, 180));
  session.set("user_agent", getHeader(requestInfo, "user-agent").slice(0, 500));
  session.set("ip_address", getClientIp(requestInfo));
  session.set("last_seen_at", currentTime);
  session.set("expires_at", addDaysIso(ACCOUNT_DEVICE_SESSION_DAYS));
  session.set("revoked_at", "");
  session.set("is_active", true);
  $app.save(session);

  return session;
};

const enforceDeviceLimit = ({ userId, deviceId, requestInfo }) => {
  if (!deviceId) {
    throw new BadRequestError("Device identifier is required for login.");
  }

  const timestamp = Date.now();
  const sessions = getUserDeviceSessions(userId);
  const currentSession = sessions.find((session) => session.get("device_id") === deviceId) || null;
  const activeSessions = [];

  for (const session of sessions) {
    if (isSessionActive(session, timestamp)) {
      activeSessions.push(session);
      continue;
    }

    if (session.get("is_active")) {
      deactivateSession(session);
    }
  }

  const activeOtherDeviceCount = activeSessions
    .filter((session) => session.get("device_id") !== deviceId)
    .length;
  const currentSessionIsActive = Boolean(
    currentSession
    && activeSessions.some((session) => session.id === currentSession.id)
  );

  if (!currentSessionIsActive && activeOtherDeviceCount >= ACCOUNT_DEVICE_LIMIT) {
    throw new ForbiddenError(`Device limit reached. Each account can be signed in on up to ${ACCOUNT_DEVICE_LIMIT} devices at the same time.`);
  }

  touchDeviceSession({ userId, deviceId, requestInfo });
};

onRecordAuthWithPasswordRequest((e) => {
  e.next();

  const userId = e.record?.id;
  if (!userId) return;

  const requestInfo = e.requestInfo();
  enforceDeviceLimit({
    userId,
    deviceId: getDeviceId(requestInfo),
    requestInfo,
  });
}, "users");

onRecordAuthRefreshRequest((e) => {
  const userId = e.record?.id;
  const requestInfo = e.requestInfo();
  const deviceId = getDeviceId(requestInfo);

  if (userId && deviceId) {
    const session = findDeviceSession(userId, deviceId);
    if (session && !isSessionActive(session)) {
      throw new UnauthorizedError("This device session is no longer active. Please sign in again.");
    }
  }

  e.next();

  if (userId && deviceId) {
    touchDeviceSession({ userId, deviceId, requestInfo });
  }
}, "users");

routerAdd("POST", "/api/device-sessions/logout", (e) => {
  const requestInfo = e.requestInfo();
  const auth = requestInfo.auth;
  const deviceId = getDeviceId(requestInfo);

  if (!auth?.id) {
    throw new UnauthorizedError("Authentication required.");
  }

  if (deviceId) {
    const session = findDeviceSession(auth.id, deviceId);
    if (session && isSessionActive(session)) {
      deactivateSession(session);
    }
  }

  return e.json(200, { success: true });
});
