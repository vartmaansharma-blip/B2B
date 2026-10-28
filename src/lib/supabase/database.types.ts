export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          organization_id: string;
          reference: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name: string;
          organization_id: string;
          reference: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          reference?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      review_events: {
        Row: {
          actor_id: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          evidence_reference: string | null;
          from_state: string | null;
          id: string;
          note: string | null;
          organization_id: string;
          qualification_expires_on: string | null;
          requirements_after: Json | null;
          requirements_before: Json | null;
          scope: string | null;
          to_state: string;
        };
        Insert: {
          actor_id: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          evidence_reference?: string | null;
          from_state?: string | null;
          id?: string;
          note?: string | null;
          organization_id: string;
          qualification_expires_on?: string | null;
          requirements_after?: Json | null;
          requirements_before?: Json | null;
          scope?: string | null;
          to_state: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          evidence_reference?: string | null;
          from_state?: string | null;
          id?: string;
          note?: string | null;
          organization_id?: string;
          qualification_expires_on?: string | null;
          requirements_after?: Json | null;
          requirements_before?: Json | null;
          scope?: string | null;
          to_state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      rfq_shortlists: {
        Row: {
          capability_id: string;
          created_at: string;
          created_by: string;
          fit_evidence_reference: string | null;
          id: string;
          organization_id: string;
          requirements_snapshot: Json;
          requirements_version: number;
          review_note: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          rfq_id: string;
          rfq_reviewed_at: string | null;
          state: string;
          supplier_id: string;
          supplier_snapshot: Json;
          supplier_version: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          capability_id: string;
          created_at?: string;
          created_by?: string;
          fit_evidence_reference?: string | null;
          id?: string;
          organization_id: string;
          requirements_snapshot?: Json;
          requirements_version: number;
          review_note: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rfq_id: string;
          rfq_reviewed_at?: string | null;
          state?: string;
          supplier_id: string;
          supplier_snapshot?: Json;
          supplier_version: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          capability_id?: string;
          created_at?: string;
          created_by?: string;
          fit_evidence_reference?: string | null;
          id?: string;
          organization_id?: string;
          requirements_snapshot?: Json;
          requirements_version?: number;
          review_note?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rfq_id?: string;
          rfq_reviewed_at?: string | null;
          state?: string;
          supplier_id?: string;
          supplier_snapshot?: Json;
          supplier_version?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rfq_shortlists_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rfq_shortlists_organization_id_rfq_id_fkey";
            columns: ["organization_id", "rfq_id"];
            isOneToOne: false;
            referencedRelation: "rfqs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "rfq_shortlists_organization_id_supplier_id_capability_id_fkey";
            columns: ["organization_id", "supplier_id", "capability_id"];
            isOneToOne: false;
            referencedRelation: "supplier_capabilities";
            referencedColumns: ["organization_id", "supplier_id", "id"];
          },
        ];
      };
      rfqs: {
        Row: {
          amendment_note: string | null;
          created_at: string;
          created_by: string;
          customer_id: string;
          drawing_reference: string | null;
          drawing_revision: string | null;
          engineering_note: string | null;
          engineering_state: Database["public"]["Enums"]["engineering_state"];
          id: string;
          organization_id: string;
          part_description: string;
          quantity: number;
          requirements_version: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["rfq_status"];
          target_date: string | null;
          title: string;
          unit: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          amendment_note?: string | null;
          created_at?: string;
          created_by?: string;
          customer_id: string;
          drawing_reference?: string | null;
          drawing_revision?: string | null;
          engineering_note?: string | null;
          engineering_state?: Database["public"]["Enums"]["engineering_state"];
          id?: string;
          organization_id: string;
          part_description: string;
          quantity: number;
          requirements_version?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["rfq_status"];
          target_date?: string | null;
          title: string;
          unit: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          amendment_note?: string | null;
          created_at?: string;
          created_by?: string;
          customer_id?: string;
          drawing_reference?: string | null;
          drawing_revision?: string | null;
          engineering_note?: string | null;
          engineering_state?: Database["public"]["Enums"]["engineering_state"];
          id?: string;
          organization_id?: string;
          part_description?: string;
          quantity?: number;
          requirements_version?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["rfq_status"];
          target_date?: string | null;
          title?: string;
          unit?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rfqs_organization_id_customer_id_fkey";
            columns: ["organization_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "rfqs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      shortlist_events: {
        Row: {
          actor_id: string;
          created_at: string;
          from_state: string | null;
          id: string;
          note: string;
          organization_id: string;
          rfq_id: string;
          shortlist_id: string;
          snapshot: Json;
          to_state: string;
        };
        Insert: {
          actor_id: string;
          created_at?: string;
          from_state?: string | null;
          id?: string;
          note: string;
          organization_id: string;
          rfq_id: string;
          shortlist_id: string;
          snapshot: Json;
          to_state: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          from_state?: string | null;
          id?: string;
          note?: string;
          organization_id?: string;
          rfq_id?: string;
          shortlist_id?: string;
          snapshot?: Json;
          to_state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shortlist_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shortlist_events_organization_id_rfq_id_shortlist_id_fkey";
            columns: ["organization_id", "rfq_id", "shortlist_id"];
            isOneToOne: false;
            referencedRelation: "rfq_shortlist_status";
            referencedColumns: ["organization_id", "rfq_id", "id"];
          },
          {
            foreignKeyName: "shortlist_events_organization_id_rfq_id_shortlist_id_fkey";
            columns: ["organization_id", "rfq_id", "shortlist_id"];
            isOneToOne: false;
            referencedRelation: "rfq_shortlists";
            referencedColumns: ["organization_id", "rfq_id", "id"];
          },
        ];
      };
      staff_memberships: {
        Row: {
          active: boolean;
          created_at: string;
          organization_id: string;
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          organization_id: string;
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["staff_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_capabilities: {
        Row: {
          created_at: string;
          created_by: string;
          evidence_reference: string;
          id: string;
          inspection_notes: string;
          material: string;
          observed_on: string;
          organization_id: string;
          process: string;
          supplier_id: string;
          tolerance_notes: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          evidence_reference: string;
          id?: string;
          inspection_notes: string;
          material: string;
          observed_on: string;
          organization_id: string;
          process: string;
          supplier_id: string;
          tolerance_notes: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          evidence_reference?: string;
          id?: string;
          inspection_notes?: string;
          material?: string;
          observed_on?: string;
          organization_id?: string;
          process?: string;
          supplier_id?: string;
          tolerance_notes?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_capabilities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_capabilities_organization_id_supplier_id_fkey";
            columns: ["organization_id", "supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      suppliers: {
        Row: {
          city: string;
          created_at: string;
          created_by: string;
          evidence_reference: string | null;
          id: string;
          materials: string;
          name: string;
          observed_on: string;
          organization_id: string;
          processes: string;
          qualification_expires_on: string | null;
          qualification_scope: string | null;
          qualification_state: Database["public"]["Enums"]["qualification_state"];
          qualified_at: string | null;
          qualified_by: string | null;
          region: string;
          review_note: string | null;
          source_reference: string;
          source_url: string | null;
          updated_at: string;
          version: number;
        };
        Insert: {
          city: string;
          created_at?: string;
          created_by?: string;
          evidence_reference?: string | null;
          id?: string;
          materials: string;
          name: string;
          observed_on: string;
          organization_id: string;
          processes: string;
          qualification_expires_on?: string | null;
          qualification_scope?: string | null;
          qualification_state?: Database["public"]["Enums"]["qualification_state"];
          qualified_at?: string | null;
          qualified_by?: string | null;
          region: string;
          review_note?: string | null;
          source_reference: string;
          source_url?: string | null;
          updated_at?: string;
          version?: number;
        };
        Update: {
          city?: string;
          created_at?: string;
          created_by?: string;
          evidence_reference?: string | null;
          id?: string;
          materials?: string;
          name?: string;
          observed_on?: string;
          organization_id?: string;
          processes?: string;
          qualification_expires_on?: string | null;
          qualification_scope?: string | null;
          qualification_state?: Database["public"]["Enums"]["qualification_state"];
          qualified_at?: string | null;
          qualified_by?: string | null;
          region?: string;
          review_note?: string | null;
          source_reference?: string;
          source_url?: string | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      rfq_shortlist_status: {
        Row: {
          capability_id: string | null;
          created_at: string | null;
          created_by: string | null;
          effective_state: string | null;
          fit_evidence_reference: string | null;
          id: string | null;
          organization_id: string | null;
          requirements_snapshot: Json | null;
          requirements_version: number | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          rfq_id: string | null;
          rfq_reviewed_at: string | null;
          state: string | null;
          supplier_id: string | null;
          supplier_snapshot: Json | null;
          supplier_version: number | null;
          updated_at: string | null;
          version: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "rfq_shortlists_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rfq_shortlists_organization_id_rfq_id_fkey";
            columns: ["organization_id", "rfq_id"];
            isOneToOne: false;
            referencedRelation: "rfqs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "rfq_shortlists_organization_id_supplier_id_capability_id_fkey";
            columns: ["organization_id", "supplier_id", "capability_id"];
            isOneToOne: false;
            referencedRelation: "supplier_capabilities";
            referencedColumns: ["organization_id", "supplier_id", "id"];
          },
        ];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      engineering_state: "pending" | "approved" | "changes_requested";
      qualification_state:
        | "discovered"
        | "contact_review"
        | "capability_review"
        | "qualified"
        | "rejected"
        | "suspended";
      rfq_status: "draft" | "reviewing" | "sourcing" | "quoted" | "closed";
      staff_role: "operator" | "engineer" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      engineering_state: ["pending", "approved", "changes_requested"],
      qualification_state: [
        "discovered",
        "contact_review",
        "capability_review",
        "qualified",
        "rejected",
        "suspended",
      ],
      rfq_status: ["draft", "reviewing", "sourcing", "quoted", "closed"],
      staff_role: ["operator", "engineer", "admin"],
    },
  },
} as const;
