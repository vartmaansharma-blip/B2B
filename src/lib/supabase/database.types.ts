// Schema contract for V0. Regenerate against local Supabase with npm run db:types.
export type Role = "operator" | "engineer" | "admin";
export type Qualification =
  | "discovered"
  | "contact_review"
  | "capability_review"
  | "qualified"
  | "rejected"
  | "suspended";
export type RfqStatus =
  "draft" | "reviewing" | "sourcing" | "quoted" | "closed";
export type EngineeringState = "pending" | "approved" | "changes_requested";
export type Supplier = {
  id: string;
  organization_id: string;
  name: string;
  city: string;
  region: string;
  processes: string;
  materials: string;
  source_reference: string;
  source_url: string | null;
  observed_on: string;
  qualification_state: Qualification;
  qualification_scope: string | null;
  evidence_reference: string | null;
  review_note: string | null;
  qualified_by: string | null;
  qualified_at: string | null;
  qualification_expires_on: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
};
export type Customer = {
  id: string;
  organization_id: string;
  name: string;
  reference: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
};
export type Rfq = {
  id: string;
  organization_id: string;
  customer_id: string;
  title: string;
  part_description: string;
  drawing_reference: string | null;
  drawing_revision: string | null;
  amendment_note: string | null;
  requirements_version: number;
  quantity: number;
  unit: string;
  target_date: string | null;
  status: RfqStatus;
  engineering_state: EngineeringState;
  engineering_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
};
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type ReviewEvent = {
  id: string;
  organization_id: string;
  entity_type: "supplier" | "rfq";
  entity_id: string;
  requirements_before: Json | null;
  requirements_after: Json | null;
  from_state: string | null;
  to_state: string;
  note: string | null;
  evidence_reference: string | null;
  scope: string | null;
  qualification_expires_on: string | null;
  actor_id: string;
  created_at: string;
};
type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
export type SupplierCapability = {
  id: string;
  organization_id: string;
  supplier_id: string;
  process: string;
  material: string;
  tolerance_notes: string;
  inspection_notes: string;
  evidence_reference: string;
  observed_on: string;
  created_by: string;
  created_at: string;
};
export type RfqShortlist = {
  id: string;
  organization_id: string;
  rfq_id: string;
  supplier_id: string;
  capability_id: string;
  requirements_version: number;
  supplier_version: number;
  state: string;
  review_note: string;
  fit_evidence_reference: string | null;
  requirements_snapshot: Json;
  supplier_snapshot: Json;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rfq_reviewed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
};
export type ShortlistEvent = {
  id: string;
  organization_id: string;
  rfq_id: string;
  shortlist_id: string;
  from_state: string | null;
  to_state: string;
  note: string;
  snapshot: Json;
  actor_id: string;
  created_at: string;
};
export type Database = {
  public: {
    Tables: {
      organizations: Table<
        { id: string; name: string; created_at: string },
        "name"
      >;
      staff_memberships: Table<
        {
          organization_id: string;
          user_id: string;
          role: Role;
          active: boolean;
          created_at: string;
        },
        "organization_id" | "user_id" | "role"
      >;
      suppliers: Table<
        Supplier,
        | "organization_id"
        | "name"
        | "city"
        | "region"
        | "processes"
        | "materials"
        | "source_reference"
        | "observed_on"
      >;
      customers: Table<Customer, "organization_id" | "name" | "reference">;
      rfqs: Table<
        Rfq,
        | "organization_id"
        | "customer_id"
        | "title"
        | "part_description"
        | "quantity"
        | "unit"
      >;
      review_events: Table<ReviewEvent>;
      supplier_capabilities: Table<
        SupplierCapability,
        | "organization_id"
        | "supplier_id"
        | "process"
        | "material"
        | "tolerance_notes"
        | "inspection_notes"
        | "evidence_reference"
        | "observed_on"
      >;
      rfq_shortlists: Table<
        RfqShortlist,
        | "organization_id"
        | "rfq_id"
        | "supplier_id"
        | "capability_id"
        | "requirements_version"
        | "supplier_version"
        | "review_note"
      >;
      shortlist_events: Table<ShortlistEvent>;
    };
    Views: {
      rfq_shortlist_status: {
        Row: RfqShortlist & { effective_state: string };
        Relationships: [];
      };
    };
    Functions: { [_ in never]: never };
    Enums: {
      staff_role: Role;
      qualification_state: Qualification;
      rfq_status: RfqStatus;
      engineering_state: EngineeringState;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
