export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      bus_boards: {
        Row: {
          board: Json
          bus_plan_id: string
          updated_at: string
        }
        Insert: {
          board?: Json
          bus_plan_id: string
          updated_at?: string
        }
        Update: {
          board?: Json
          bus_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_boards_bus_plan_id_fkey"
            columns: ["bus_plan_id"]
            isOneToOne: true
            referencedRelation: "bus_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_groups: {
        Row: {
          bus_plan_id: string
          group_name: string
          id: string
          pickup_point: string
          place_id: string | null
          quantity: number
        }
        Insert: {
          bus_plan_id: string
          group_name: string
          id?: string
          pickup_point: string
          place_id?: string | null
          quantity?: number
        }
        Update: {
          bus_plan_id?: string
          group_name?: string
          id?: string
          pickup_point?: string
          place_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bus_groups_bus_plan_id_fkey"
            columns: ["bus_plan_id"]
            isOneToOne: false
            referencedRelation: "bus_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_plans: {
        Row: {
          arrival_time: string | null
          created_at: string
          destination: string | null
          destination_place_id: string | null
          id: string
          mifal_id: string
          name: string
          use_toll_roads: boolean
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          destination?: string | null
          destination_place_id?: string | null
          id?: string
          mifal_id: string
          name?: string
          use_toll_roads?: boolean
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          destination?: string | null
          destination_place_id?: string | null
          id?: string
          mifal_id?: string
          name?: string
          use_toll_roads?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bus_plans_mifal_id_fkey"
            columns: ["mifal_id"]
            isOneToOne: false
            referencedRelation: "mifalim"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_types: {
        Row: {
          bus_plan_id: string
          capacity: number
          id: string
          label: string
        }
        Insert: {
          bus_plan_id: string
          capacity: number
          id?: string
          label: string
        }
        Update: {
          bus_plan_id?: string
          capacity?: number
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_types_bus_plan_id_fkey"
            columns: ["bus_plan_id"]
            isOneToOne: false
            referencedRelation: "bus_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          expense_name: string | null
          expense_type: Database["public"]["Enums"]["expense_type"] | null
          id: string
          notes: string | null
          occurred_at: string | null
          owner_id: string | null
          owner_type: Database["public"]["Enums"]["budget_owner_type"]
          quantity: number | null
          supplier_id: string | null
          unit_price: number | null
        }
        Insert: {
          expense_name?: string | null
          expense_type?: Database["public"]["Enums"]["expense_type"] | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          owner_id?: string | null
          owner_type: Database["public"]["Enums"]["budget_owner_type"]
          quantity?: number | null
          supplier_id?: string | null
          unit_price?: number | null
        }
        Update: {
          expense_name?: string | null
          expense_type?: Database["public"]["Enums"]["expense_type"] | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          owner_id?: string | null
          owner_type?: Database["public"]["Enums"]["budget_owner_type"]
          quantity?: number | null
          supplier_id?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      external_income: {
        Row: {
          amount: number | null
          id: string
          occurred_at: string | null
          owner_id: string | null
          owner_type: Database["public"]["Enums"]["budget_owner_type"]
          source_name: string | null
        }
        Insert: {
          amount?: number | null
          id?: string
          occurred_at?: string | null
          owner_id?: string | null
          owner_type: Database["public"]["Enums"]["budget_owner_type"]
          source_name?: string | null
        }
        Update: {
          amount?: number | null
          id?: string
          occurred_at?: string | null
          owner_id?: string | null
          owner_type?: Database["public"]["Enums"]["budget_owner_type"]
          source_name?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          category: string | null
          id: string
          modified_at: string
          modified_by: string | null
          name: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["budget_owner_type"]
          size: number | null
          storage_path: string
        }
        Insert: {
          category?: string | null
          id?: string
          modified_at?: string
          modified_by?: string | null
          name: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["budget_owner_type"]
          size?: number | null
          storage_path: string
        }
        Update: {
          category?: string | null
          id?: string
          modified_at?: string
          modified_by?: string | null
          name?: string
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["budget_owner_type"]
          size?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mega_project_links: {
        Row: {
          mega_project_id: string
          mifal_id: string
        }
        Insert: {
          mega_project_id: string
          mifal_id: string
        }
        Update: {
          mega_project_id?: string
          mifal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mega_project_links_mega_project_id_fkey"
            columns: ["mega_project_id"]
            isOneToOne: false
            referencedRelation: "mega_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mega_project_links_mifal_id_fkey"
            columns: ["mifal_id"]
            isOneToOne: false
            referencedRelation: "mifalim"
            referencedColumns: ["id"]
          },
        ]
      }
      mega_projects: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      mifal_balance_transfers: {
        Row: {
          amount: number
          id: string
          mifal_id: string
          note: string | null
          transferred_at: string
          transferred_by: string | null
        }
        Insert: {
          amount: number
          id?: string
          mifal_id: string
          note?: string | null
          transferred_at?: string
          transferred_by?: string | null
        }
        Update: {
          amount?: number
          id?: string
          mifal_id?: string
          note?: string | null
          transferred_at?: string
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mifal_balance_transfers_mifal_id_fkey"
            columns: ["mifal_id"]
            isOneToOne: false
            referencedRelation: "mifalim"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mifal_balance_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mifalim: {
        Row: {
          accommodation: string | null
          backup_date: string | null
          backup_end_date: string | null
          backup_start_date: string | null
          balance_transferred_at: string | null
          camp_type: string | null
          comments: string | null
          created_at: string
          date_mode: string | null
          end_date: string | null
          event_date: string | null
          id: string
          lead_role: string | null
          name: string
          parent_mifal_id: string | null
          prep_date_mode: string | null
          routes: string | null
          seminar_type: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["mifal_status"] | null
          target_audience: string[] | null
          target_municipalities: string[] | null
          trip_type: string | null
          type: Database["public"]["Enums"]["mifal_type"]
          updated_at: string
          work_start_date: string | null
        }
        Insert: {
          accommodation?: string | null
          backup_date?: string | null
          backup_end_date?: string | null
          backup_start_date?: string | null
          balance_transferred_at?: string | null
          camp_type?: string | null
          comments?: string | null
          created_at?: string
          date_mode?: string | null
          end_date?: string | null
          event_date?: string | null
          id?: string
          lead_role?: string | null
          name?: string
          parent_mifal_id?: string | null
          prep_date_mode?: string | null
          routes?: string | null
          seminar_type?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["mifal_status"] | null
          target_audience?: string[] | null
          target_municipalities?: string[] | null
          trip_type?: string | null
          type: Database["public"]["Enums"]["mifal_type"]
          updated_at?: string
          work_start_date?: string | null
        }
        Update: {
          accommodation?: string | null
          backup_date?: string | null
          backup_end_date?: string | null
          backup_start_date?: string | null
          balance_transferred_at?: string | null
          camp_type?: string | null
          comments?: string | null
          created_at?: string
          date_mode?: string | null
          end_date?: string | null
          event_date?: string | null
          id?: string
          lead_role?: string | null
          name?: string
          parent_mifal_id?: string | null
          prep_date_mode?: string | null
          routes?: string | null
          seminar_type?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["mifal_status"] | null
          target_audience?: string[] | null
          target_municipalities?: string[] | null
          trip_type?: string | null
          type?: Database["public"]["Enums"]["mifal_type"]
          updated_at?: string
          work_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mifalim_parent_mifal_id_fkey"
            columns: ["parent_mifal_id"]
            isOneToOne: false
            referencedRelation: "mifalim"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrences: {
        Row: {
          end_date: string | null
          id: string
          mifal_id: string
          name: string | null
          notes: string | null
          start_date: string | null
        }
        Insert: {
          end_date?: string | null
          id?: string
          mifal_id: string
          name?: string | null
          notes?: string | null
          start_date?: string | null
        }
        Update: {
          end_date?: string | null
          id?: string
          mifal_id?: string
          name?: string | null
          notes?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "occurrences_mifal_id_fkey"
            columns: ["mifal_id"]
            isOneToOne: false
            referencedRelation: "mifalim"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          actual_participants: number | null
          age_group: string | null
          expected_participants: number | null
          id: string
          mifal_id: string
          price_per_participant: number | null
        }
        Insert: {
          actual_participants?: number | null
          age_group?: string | null
          expected_participants?: number | null
          id?: string
          mifal_id: string
          price_per_participant?: number | null
        }
        Update: {
          actual_participants?: number | null
          age_group?: string | null
          expected_participants?: number | null
          id?: string
          mifal_id?: string
          price_per_participant?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_mifal_id_fkey"
            columns: ["mifal_id"]
            isOneToOne: false
            referencedRelation: "mifalim"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      stakeholders: {
        Row: {
          email: string | null
          full_name: string | null
          id: string
          mifal_id: string
          role: string | null
        }
        Insert: {
          email?: string | null
          full_name?: string | null
          id?: string
          mifal_id: string
          role?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          id?: string
          mifal_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_mifal_id_fkey"
            columns: ["mifal_id"]
            isOneToOne: false
            referencedRelation: "mifalim"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          comments: string | null
          created_at: string
          deadline: string | null
          id: string
          is_completed: boolean
          mifal_id: string
          task_name: string
        }
        Insert: {
          assigned_to?: string | null
          comments?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          is_completed?: boolean
          mifal_id: string
          task_name?: string
        }
        Update: {
          assigned_to?: string | null
          comments?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          is_completed?: boolean
          mifal_id?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_mifal_id_fkey"
            columns: ["mifal_id"]
            isOneToOne: false
            referencedRelation: "mifalim"
            referencedColumns: ["id"]
          },
        ]
      }
      user_events: {
        Row: {
          event_id: string
          has_budget_access: boolean
          user_id: string
        }
        Insert: {
          event_id: string
          has_budget_access?: boolean
          user_id: string
        }
        Update: {
          event_id?: string
          has_budget_access?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mifalim"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_event_budget_access: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      is_admin_or_super: { Args: never; Returns: boolean }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      transfer_mifal_balance: {
        Args: { p_mifal_id: string; p_note?: string }
        Returns: number
      }
    }
    Enums: {
      budget_owner_type: "mifal" | "mega_project" | "general"
      expense_type:
        | "מזון"
        | "הסעות"
        | "אבטחה ורפואה"
        | "ציוד משרדי"
        | "ציוד מחנאי"
        | "דפוס וטקסטיל"
        | "רכב"
        | "השכרת מקום"
      mifal_status:
        | "מתוכנן"
        | "בעבודה"
        | "ממתין להפקת לקחים"
        | "הסתיים"
        | "בוטל"
      mifal_type: "day_trip" | "multi_day" | "seminar" | "preparation"
      user_role: "super_admin" | "admin" | "no_budget" | "event_specific"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      budget_owner_type: ["mifal", "mega_project", "general"],
      expense_type: [
        "מזון",
        "הסעות",
        "אבטחה ורפואה",
        "ציוד משרדי",
        "ציוד מחנאי",
        "דפוס וטקסטיל",
        "רכב",
        "השכרת מקום",
      ],
      mifal_status: ["מתוכנן", "בעבודה", "ממתין להפקת לקחים", "הסתיים", "בוטל"],
      mifal_type: ["day_trip", "multi_day", "seminar", "preparation"],
      user_role: ["super_admin", "admin", "no_budget", "event_specific"],
    },
  },
} as const
