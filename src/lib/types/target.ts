import { Timestamp } from "firebase/firestore";

export type TargetType = "domain" | "ip" | "url";

export interface Target {
  id: string;
  userId: string;
  name: string;
  value: string; // The actual domain, IP, or URL string
  type: TargetType;
  tags?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastScanAt?: Timestamp;
  healthScore?: number; // 0-100 score based on recent vulnerability severity
}

export interface CreateTargetRequest {
  name: string;
  value: string;
  type: TargetType;
  tags?: string[];
}
