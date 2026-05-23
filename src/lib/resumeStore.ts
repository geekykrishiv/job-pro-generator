import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MasterLatexResume, ResumeProject, ResumeVersion, ChatMessage, ATSScoreResult } from "@/types";
import { ANTHROPIC_CONFIG } from "@/config/anthropic";
import { resolveAnthropicKey } from "./claude";
import { deleteField } from 'firebase/firestore';

function removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj, (_, v) => v === undefined ? null : v));
}

// ─── Document References ────────────────────────────────────────────────

const userDoc = (uid: string) => doc(db, "users", uid);
const projectsCol = (uid: string) => collection(db, "users", uid, "projects");
const projectDoc = (uid: string, pid: string) => doc(db, "users", uid, "projects", pid);

// ─── User Settings ──────────────────────────────────────────────────────

export async function getUserSettings(uid: string): Promise<{ anthropicKey?: string; geminiKey?: string }> {
  const snap = await getDoc(userDoc(uid));
  const data = snap.data();
  return {
    anthropicKey: data?.anthropicKey ?? data?.geminiKey,
    geminiKey: data?.geminiKey,
  };
}

export async function saveUserSettings(uid: string, settings: { anthropicKey?: string }) {
  await setDoc(userDoc(uid), removeUndefined({ anthropicKey: settings.anthropicKey }), { merge: true });
}

// ─── Master LaTeX Resume ────────────────────────────────────────────────

export async function getMasterLatexResume(uid: string): Promise<MasterLatexResume | null> {
  const snap = await getDoc(userDoc(uid));
  const data = snap.data()?.masterLatexResume as MasterLatexResume | undefined;
  return data ?? null;
}

export async function saveMasterLatexResume(uid: string, resume: MasterLatexResume) {
  await setDoc(userDoc(uid), removeUndefined({ masterLatexResume: resume }), { merge: true });
}

// ─── Projects CRUD ──────────────────────────────────────────────────────

export async function listProjects(uid: string): Promise<ResumeProject[]> {
  const q = query(projectsCol(uid), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ResumeProject);
}

export async function getProject(uid: string, pid: string): Promise<ResumeProject | null> {
  const snap = await getDoc(projectDoc(uid, pid));
  return (snap.data() as ResumeProject) ?? null;
}

export async function createProject(uid: string, name: string): Promise<ResumeProject> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const project: ResumeProject = {
    id,
    name,
    jobDescription: "",
    chatHistory: [],
    versions: [],
    currentLatex: "",
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(projectDoc(uid, id), removeUndefined(project as unknown as Record<string, unknown>));
  return project;
}

export async function updateProject(uid: string, pid: string, patch: Partial<ResumeProject>) {
  await updateDoc(projectDoc(uid, pid), removeUndefined({ ...patch, updatedAt: Date.now() }));
}

export async function deleteProject(uid: string, pid: string) {
  await deleteDoc(projectDoc(uid, pid));
}

// ─── Version Management (Subcollection) ───────────────────────────────────

const versionsCol = (uid: string, pid: string) => collection(db, "users", uid, "projects", pid, "versions");

export async function saveResumeVersion(
  uid: string,
  pid: string,
  latex: string,
  atsScore?: ATSScoreResult | null,
  pdfUrl?: string | null
) {
  const versionId = crypto.randomUUID();
  const projectRef = projectDoc(uid, pid);
  
  await updateDoc(projectRef, removeUndefined({
    currentLatex: latex,
    atsScore: atsScore ?? null,
    pdfUrl: pdfUrl ?? null,
    updatedAt: Date.now(),
  }));

  const versionDocRef = doc(db, "users", uid, "projects", pid, "versions", versionId);
  await setDoc(versionDocRef, removeUndefined({
    id: versionId,
    latex,
    atsScore: atsScore ?? null,
    pdfUrl: pdfUrl ?? null,
    createdAt: Date.now(),
  }));
}

export async function getLatestVersion(uid: string, pid: string) {
  const q = query(versionsCol(uid, pid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

// ─── Version Management (Legacy Inline Array - preserved for compat) ─────

export async function addResumeVersion(
  uid: string,
  pid: string,
  version: ResumeVersion,
): Promise<void> {
  const proj = await getProject(uid, pid);
  if (!proj) throw new Error("Project not found");
  const versions = [...proj.versions, version];
  await updateProject(uid, pid, { versions, activeVersionId: version.id });
}

export async function deleteResumeVersion(
  uid: string,
  pid: string,
  versionId: string,
): Promise<void> {
  const proj = await getProject(uid, pid);
  if (!proj) throw new Error("Project not found");
  const versions = proj.versions.filter((v) => v.id !== versionId);
  const activeVersionId =
    proj.activeVersionId === versionId
      ? versions[versions.length - 1]?.id
      : proj.activeVersionId;
  await updateProject(uid, pid, { versions, activeVersionId });
}

export async function restoreResumeVersion(
  uid: string,
  pid: string,
  versionId: string,
): Promise<ResumeVersion | null> {
  const proj = await getProject(uid, pid);
  if (!proj) throw new Error("Project not found");
  const version = proj.versions.find((v) => v.id === versionId);
  if (!version) return null;
  await updateProject(uid, pid, {
    currentLatex: version.latex,
    activeVersionId: versionId,
  });
  return version;
}

// ─── API Key Validation ─────────────────────────────────────────────────

export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  const key = resolveAnthropicKey(apiKey);
  if (!key) return false;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_CONFIG.API_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: ANTHROPIC_CONFIG.MODEL,
        max_tokens: 16,
        messages: [{ role: "user", content: "Reply with OK only." }],
      }),
    });
    if (response.status === 401 || response.status === 403) return false;
    return response.ok;
  } catch {
    return false;
  }
}

/** @deprecated Use validateAnthropicKey */
export const validateGeminiKey = validateAnthropicKey;
