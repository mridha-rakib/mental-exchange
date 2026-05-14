import pb from './pocketbaseClient.js';
import logger from './logger.js';

const JOB_COLLECTION = 'dhl_label_jobs';
const LOCK_COLLECTION = 'dhl_label_locks';
const DEFAULT_LOCK_TTL_MS = Math.max(60_000, Number(process.env.DHL_LABEL_LOCK_TTL_MS || 10 * 60 * 1000));

export class DhlLabelJobConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'DhlLabelJobConflictError';
    this.status = 409;
    this.details = details;
  }
}

export const buildDhlSubjectKey = (subjectType, subjectId) =>
  `${String(subjectType || '').trim()}:${String(subjectId || '').trim()}`;

const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const toIso = (date) => date.toISOString();

const getLockExpiry = () => toIso(new Date(Date.now() + DEFAULT_LOCK_TTL_MS));

const isFuture = (value) => {
  const timestamp = new Date(value || '').getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
};

const getJobBySubjectKey = async (subjectKey) =>
  pb.collection(JOB_COLLECTION)
    .getFirstListItem(`subject_key="${escapeFilterValue(subjectKey)}"`, { $autoCancel: false })
    .catch(() => null);

const getLockBySubjectKey = async (subjectKey) =>
  pb.collection(LOCK_COLLECTION)
    .getFirstListItem(`subject_key="${escapeFilterValue(subjectKey)}"`, { $autoCancel: false })
    .catch(() => null);

const normalizeAttempts = (job) => Math.max(0, Number(job?.attempts || 0));

const serializeJobError = (error) => {
  const dhl = error?.dhl || {};
  return {
    message: error?.message || 'Unknown DHL label error',
    type: dhl.type || 'unknown',
    status: dhl.status || null,
    operation: dhl.operation || '',
    ambiguous: dhl.ambiguous === true,
    retryable: dhl.retryable === true,
  };
};

const updateJob = (id, data) => pb.collection(JOB_COLLECTION).update(id, data, { $autoCancel: false });

const releaseDhlLabelLock = async (subjectKey) => {
  const lock = await getLockBySubjectKey(subjectKey);
  if (!lock?.id) return null;
  return pb.collection(LOCK_COLLECTION).delete(lock.id, { $autoCancel: false }).catch(() => null);
};

const acquireDhlLabelLock = async ({ subjectKey, requestedBy, idempotencyKey }) => {
  const payload = {
    subject_key: subjectKey,
    idempotency_key: String(idempotencyKey || subjectKey),
    requested_by: String(requestedBy || ''),
    expires_at: getLockExpiry(),
  };

  try {
    return await pb.collection(LOCK_COLLECTION).create(payload, { $autoCancel: false });
  } catch (error) {
    const existing = await getLockBySubjectKey(subjectKey);

    if (!existing) {
      throw error;
    }

    if (isFuture(existing.expires_at)) {
      throw new DhlLabelJobConflictError(
        'DHL label generation is already locked for this record.',
        { subjectKey, lock: existing }
      );
    }

    await pb.collection(LOCK_COLLECTION).delete(existing.id, { $autoCancel: false }).catch(() => null);

    try {
      return await pb.collection(LOCK_COLLECTION).create(payload, { $autoCancel: false });
    } catch (retryError) {
      const racedLock = await getLockBySubjectKey(subjectKey);
      throw new DhlLabelJobConflictError(
        'DHL label generation lock was acquired by another request.',
        { subjectKey, lock: racedLock || existing }
      );
    }
  }
};

export const beginDhlLabelJob = async ({
  subjectType,
  subjectId,
  idempotencyKey,
  requestedBy = '',
  metadata = {},
}) => {
  const subjectKey = buildDhlSubjectKey(subjectType, subjectId);
  if (!subjectType || !subjectId || subjectKey === ':') {
    throw new Error('DHL label job requires subjectType and subjectId');
  }

  const now = new Date().toISOString();
  const basePayload = {
    subject_key: subjectKey,
    subject_type: String(subjectType),
    subject_id: String(subjectId),
    idempotency_key: String(idempotencyKey || subjectKey),
    status: 'processing',
    requested_by: String(requestedBy || ''),
    locked_until: getLockExpiry(),
    last_error: '',
    failure_type: '',
    metadata,
    last_attempt_at: now,
  };

  const existing = await getJobBySubjectKey(subjectKey);

  if (existing?.status === 'generated' && existing.tracking_number && existing.label_saved === true) {
    return { state: 'generated', job: existing };
  }

  const lock = await acquireDhlLabelLock({
    subjectKey,
    requestedBy,
    idempotencyKey: basePayload.idempotency_key,
  });

  if (existing?.status === 'unknown') {
    await releaseDhlLabelLock(subjectKey);
    throw new DhlLabelJobConflictError(
      'Previous DHL label attempt has an uncertain result and must be reconciled before retrying.',
      { subjectKey, job: existing }
    );
  }

  if (existing?.status === 'processing' && isFuture(existing.locked_until)) {
    await releaseDhlLabelLock(subjectKey);
    throw new DhlLabelJobConflictError(
      'DHL label generation is already in progress for this record.',
      { subjectKey, job: existing }
    );
  }

  if (existing?.status === 'processing' && !isFuture(existing.locked_until)) {
    const updated = await updateJob(existing.id, {
      status: 'unknown',
      locked_until: '',
      failure_type: 'stale_processing_lock',
      last_error: 'Previous DHL label attempt expired before it recorded a final result. Manual reconciliation is required to avoid duplicate labels.',
    }).catch(() => existing);

    await releaseDhlLabelLock(subjectKey);
    throw new DhlLabelJobConflictError(
      'Previous DHL label attempt expired without a final result. Manual reconciliation is required before retrying.',
      { subjectKey, job: updated }
    );
  }

  if (existing) {
    const updated = await updateJob(existing.id, {
      ...basePayload,
      attempts: normalizeAttempts(existing) + 1,
      lock_id: lock.id,
    });
    return { state: 'processing', job: updated };
  }

  try {
    const created = await pb.collection(JOB_COLLECTION).create({
      ...basePayload,
      attempts: 1,
      label_saved: false,
      lock_id: lock.id,
    }, { $autoCancel: false });

    return { state: 'processing', job: created };
  } catch (error) {
    await releaseDhlLabelLock(subjectKey);
    const racedJob = await getJobBySubjectKey(subjectKey);
    if (racedJob) {
      logger.warn(`[DHL-JOB] Concurrent label job create detected - Subject: ${subjectKey}`);
      throw new DhlLabelJobConflictError(
        'DHL label generation is already registered for this record.',
        { subjectKey, job: racedJob }
      );
    }

    throw error;
  }
};

export const completeDhlLabelJob = async (job, result = {}) => {
  if (!job?.id) return null;

  const updated = await updateJob(job.id, {
    status: 'generated',
    locked_until: '',
    tracking_number: result.tracking_number || result.shipment_number || '',
    shipment_number: result.shipment_number || result.tracking_number || '',
    product_used: result.product_used || '',
    destination_country: result.destination_country || '',
    generated_at: result.generated_at || new Date().toISOString(),
    completed_at: new Date().toISOString(),
    label_saved: true,
    last_error: '',
    failure_type: '',
  });

  await releaseDhlLabelLock(job.subject_key);
  return updated;
};

export const failDhlLabelJob = async (job, error) => {
  if (!job?.id) return null;

  const serialized = serializeJobError(error);
  const status = serialized.ambiguous ? 'unknown' : 'failed';

  const updated = await updateJob(job.id, {
    status,
    locked_until: '',
    last_error: serialized.message,
    failure_type: serialized.type,
    failed_at: new Date().toISOString(),
    metadata: {
      ...(job.metadata || {}),
      lastError: serialized,
    },
  }).catch(() => null);

  await releaseDhlLabelLock(job.subject_key);
  return updated;
};

export const cancelDhlLabelJob = async (subjectType, subjectId) => {
  const subjectKey = buildDhlSubjectKey(subjectType, subjectId);
  const job = await getJobBySubjectKey(subjectKey);
  if (!job?.id) return null;

  const updated = await updateJob(job.id, {
    status: 'cancelled',
    locked_until: '',
    label_saved: false,
    completed_at: '',
  }).catch(() => null);

  await releaseDhlLabelLock(subjectKey);
  return updated;
};

export const getDhlLabelJob = async (subjectType, subjectId) =>
  getJobBySubjectKey(buildDhlSubjectKey(subjectType, subjectId));
