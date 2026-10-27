import type { Database } from "./supabase/database.types";
export type Role = Database["public"]["Enums"]["staff_role"];
export type Qualification = Database["public"]["Enums"]["qualification_state"];
export type RfqStatus = Database["public"]["Enums"]["rfq_status"];
export type EngineeringState = Database["public"]["Enums"]["engineering_state"];
export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Rfq = Database["public"]["Tables"]["rfqs"]["Row"];
export type ReviewEvent = Database["public"]["Tables"]["review_events"]["Row"];
