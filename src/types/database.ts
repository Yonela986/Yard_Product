// Hand-written to match the Supabase migrations in this repo.
// Regenerate with `npm run types:gen` once the migration is applied.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      message_log: {
        Row: {
          id: string;
          tenant_id: string;
          kind: string;
          payment_id: string | null;
          language: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          kind: string;
          payment_id?: string | null;
          language: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          kind?: string;
          payment_id?: string | null;
          language?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_log_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_log_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      landlords: {
        Row: {
          id: string;
          name: string;
          phone: string;
          language: string;
          reminder_tone: string;
          upcoming_reminder_days: number;
          onboarding_completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          phone: string;
          language?: string;
          reminder_tone?: string;
          upcoming_reminder_days?: number;
          onboarding_completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          language?: string;
          reminder_tone?: string;
          upcoming_reminder_days?: number;
          onboarding_completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          landlord_id: string;
          name: string;
          address: string | null;
          bank_details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          landlord_id: string;
          name: string;
          address?: string | null;
          bank_details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          landlord_id?: string;
          name?: string;
          address?: string | null;
          bank_details?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "properties_landlord_id_fkey";
            columns: ["landlord_id"];
            isOneToOne: false;
            referencedRelation: "landlords";
            referencedColumns: ["id"];
          },
        ];
      };
      receipt_counters: {
        Row: {
          landlord_id: string;
          last_number: number;
        };
        Insert: {
          landlord_id: string;
          last_number?: number;
        };
        Update: {
          landlord_id?: string;
          last_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "receipt_counters_landlord_id_fkey";
            columns: ["landlord_id"];
            isOneToOne: true;
            referencedRelation: "landlords";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          monthly_rent_cents: number;
          due_day: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          name: string;
          monthly_rent_cents: number;
          due_day?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          name?: string;
          monthly_rent_cents?: number;
          due_day?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          id: string;
          room_id: string;
          name: string;
          phone: string;
          language: string;
          move_in_date: string;
          deposit_cents: number;
          move_out_date: string | null;
          access_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          name: string;
          phone: string;
          language?: string;
          move_in_date: string;
          deposit_cents?: number;
          move_out_date?: string | null;
          access_token: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          name?: string;
          phone?: string;
          language?: string;
          move_in_date?: string;
          deposit_cents?: number;
          move_out_date?: string | null;
          access_token?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenants_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      charges: {
        Row: {
          id: string;
          tenant_id: string;
          type: string;
          period: string;
          amount_cents: number;
          due_date: string;
          note: string | null;
          created_at: string;
          utility_bill_id: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type: string;
          period: string;
          amount_cents: number;
          due_date: string;
          note?: string | null;
          created_at?: string;
          utility_bill_id?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          type?: string;
          period?: string;
          amount_cents?: number;
          due_date?: string;
          note?: string | null;
          created_at?: string;
          utility_bill_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "charges_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "charges_utility_bill_id_fkey";
            columns: ["utility_bill_id"];
            isOneToOne: false;
            referencedRelation: "utility_bills";
            referencedColumns: ["id"];
          },
        ];
      };
      utility_bills: {
        Row: {
          id: string;
          property_id: string;
          type: string;
          period: string;
          total_cents: number;
          split_method: string;
          due_date: string;
          includes_main_house: boolean;
          main_house_cents: number;
          shares: Json;
          note: string | null;
          voided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          type: string;
          period: string;
          total_cents: number;
          split_method: string;
          due_date: string;
          includes_main_house?: boolean;
          main_house_cents?: number;
          shares?: Json;
          note?: string | null;
          voided_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          type?: string;
          period?: string;
          total_cents?: number;
          split_method?: string;
          due_date?: string;
          includes_main_house?: boolean;
          main_house_cents?: number;
          shares?: Json;
          note?: string | null;
          voided_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "utility_bills_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      meter_readings: {
        Row: {
          id: string;
          room_id: string;
          type: string;
          reading: number;
          read_on: string;
          bill_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          type: string;
          reading: number;
          read_on?: string;
          bill_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          type?: string;
          reading?: number;
          read_on?: string;
          bill_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meter_readings_bill_id_fkey";
            columns: ["bill_id"];
            isOneToOne: false;
            referencedRelation: "utility_bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meter_readings_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          tenant_id: string;
          amount_cents: number;
          paid_on: string;
          method: string;
          proof_url: string | null;
          status: string;
          receipt_number: string | null;
          created_by: string;
          created_at: string;
          voided_at: string | null;
          void_reason: string | null;
          decline_reason: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          amount_cents: number;
          paid_on: string;
          method: string;
          proof_url?: string | null;
          status?: string;
          receipt_number?: string | null;
          created_by?: string;
          created_at?: string;
          voided_at?: string | null;
          void_reason?: string | null;
          decline_reason?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          amount_cents?: number;
          paid_on?: string;
          method?: string;
          proof_url?: string | null;
          status?: string;
          receipt_number?: string | null;
          created_by?: string;
          created_at?: string;
          voided_at?: string | null;
          void_reason?: string | null;
          decline_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      tenant_balances: {
        Row: {
          tenant_id: string | null;
          room_id: string | null;
          charged_cents: number | null;
          paid_cents: number | null;
          balance_cents: number | null;
          overdue_cents: number | null;
          paid_this_month_cents: number | null;
          oldest_unpaid_due_date: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      complete_onboarding: {
        Args: {
          p_name: string;
          p_language: string;
          p_property_name: string;
          p_address: string;
          p_rooms: Json;
        };
        Returns: string;
      };
      owns_property: { Args: { p_property_id: string }; Returns: boolean };
      owns_room: { Args: { p_room_id: string }; Returns: boolean };
      get_tenant_page: {
        Args: { p_access_token: string };
        Returns: {
          tenant_name: string;
          move_in_date: string;
          move_out_date: string | null;
          room_name: string;
          property_name: string;
          monthly_rent_cents: number;
          due_day: number;
        }[];
      };
      get_tenant_page_v2: {
        Args: { p_access_token: string };
        Returns: {
          tenant_name: string;
          move_in_date: string;
          move_out_date: string | null;
          room_name: string;
          property_name: string;
          monthly_rent_cents: number;
          due_day: number;
          balance_cents: number;
          overdue_cents: number;
          paid_this_month_cents: number;
          oldest_unpaid_due_date: string | null;
          payment_status: string;
          landlord_name: string;
          landlord_phone: string;
          property_address: string | null;
        }[];
      };
      get_tenant_receipts: {
        Args: { p_access_token: string };
        Returns: {
          paid_on: string;
          created_at: string;
          amount_cents: number;
          method: string;
          receipt_number: string;
          balance_after_cents: number;
        }[];
      };
      tenant_payment_info: {
        Args: { p_token: string };
        Returns: Json;
      };
      tenant_proof_folder: {
        Args: { p_token: string };
        Returns: string | null;
      };
      submit_tenant_payment: {
        Args: {
          p_token: string;
          p_amount_cents: number;
          p_paid_on: string;
          p_method: string;
          p_proof_path: string | null;
        };
        Returns: string;
      };
      confirm_pending_payment: {
        Args: {
          p_payment_id: string;
          p_amount_cents: number;
          p_paid_on: string;
          p_method: string;
        };
        Returns: string;
      };
      decline_pending_payment: {
        Args: { p_payment_id: string; p_reason: string | null };
        Returns: undefined;
      };
      // message_log has no database RPCs.
      regenerate_tenant_token: { Args: { p_tenant_id: string }; Returns: string };
      today_sa: { Args: Record<PropertyKey, never>; Returns: string };
      owns_tenant: { Args: { p_tenant_id: string }; Returns: boolean };
      generate_rent_charges: { Args: Record<PropertyKey, never>; Returns: number };
      create_utility_bill: {
        Args: {
          p_property_id: string;
          p_type: string;
          p_period: string;
          p_total_cents: number;
          p_split_method: string;
          p_due_date: string;
          p_includes_main_house: boolean;
          p_main_house_cents: number;
          p_shares: Json;
          p_readings: Json;
          p_note: string | null;
        };
        Returns: string;
      };
      void_utility_bill: { Args: { p_bill_id: string }; Returns: undefined };
      tenant_charges: { Args: { p_token: string }; Returns: Json };
      void_payment: {
        Args: { p_payment_id: string; p_reason: string };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
