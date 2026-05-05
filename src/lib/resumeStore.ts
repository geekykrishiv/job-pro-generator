import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MasterResume, ResumeProject } from "@/types";

const userDoc = (uid: string) => doc(db, "users", uid);
const projectsCol = (uid: string) => collection(db, "users", uid, "projects");
const projectDoc = (uid: string, pid: string) => doc(db, "users", uid, "projects", pid);

export async function getUserSettings(uid: string): Promise<{ geminiKey?: string }> {
  const snap = await getDoc(userDoc(uid));
  return (snap.data()?.settings as any) ?? {};
}

export async function saveUserSettings(uid: string, settings: { geminiKey?: string }) {
  await setDoc(userDoc(uid), { settings }, { merge: true });
}

export async function getMasterResume(uid: string): Promise<MasterResume | null> {
  const snap = await getDoc(userDoc(uid));
  return (snap.data()?.masterResume as MasterResume) ?? null;
}

export async function saveMasterResume(uid: string, master: MasterResume) {
  await setDoc(userDoc(uid), { masterResume: master }, { merge: true });
}

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
  await setDoc(projectDoc(uid, id), project);
  return project;
}

export async function updateProject(uid: string, pid: string, patch: Partial<ResumeProject>) {
  await updateDoc(projectDoc(uid, pid), { ...patch, updatedAt: Date.now() });
}

export async function deleteProject(uid: string, pid: string) {
  await deleteDoc(projectDoc(uid, pid));
}
