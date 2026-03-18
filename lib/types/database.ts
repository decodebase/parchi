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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      events: {
        Row: {
          address: string | null
          categories: string[] | null
          city: string
          cover_image: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_date: string
          id: string
          is_featured: boolean | null
          lat: number | null
          lng: number | null
          organiser_id: string
          promo_video_url: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          venue: string
        }
        Insert: {
          address?: string | null
          categories?: string[] | null
          city: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          is_featured?: boolean | null
          lat?: number | null
          lng?: number | null
          organiser_id: string
          promo_video_url?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          venue: string
        }
        Update: {
          address?: string | null
          categories?: string[] | null
          city?: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          is_featured?: boolean | null
          lat?: number | null
          lng?: number | null
          organiser_id?: string
          promo_video_url?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organiser_id_fkey"
            columns: ["organiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_slots: {
        Row: {
          created_at: string | null
          ends_at: string
          event_id: string
          id: string
          organiser_id: string
          price_paid: number
          slot_type: string
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          event_id: string
          id?: string
          organiser_id: string
          price_paid?: number
          slot_type: string
          starts_at: string
          status?: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          event_id?: string
          id?: string
          organiser_id?: string
          price_paid?: number
          slot_type?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_slots_organiser_id_fkey"
            columns: ["organiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          event_id: string
          gateway_ref: string | null
          gateway_type: string | null
          id: string
          quantity: number
          status: string
          tier_id: string
          total_amount: number
          unit_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          gateway_ref?: string | null
          gateway_type?: string | null
          id?: string
          quantity?: number
          status?: string
          tier_id: string
          total_amount: number
          unit_price: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          gateway_ref?: string | null
          gateway_type?: string | null
          id?: string
          quantity?: number
          status?: string
          tier_id?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organiser_applications: {
        Row: {
          business_name: string
          business_type: string | null
          created_at: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          business_name: string
          business_type?: string | null
          created_at?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          business_name?: string
          business_type?: string | null
          created_at?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organiser_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organiser_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organiser_settings: {
        Row: {
          business_name: string | null
          created_at: string | null
          gateway_config: Json | null
          gateway_type: string | null
          is_approved: boolean | null
          organiser_id: string
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          gateway_config?: Json | null
          gateway_type?: string | null
          is_approved?: boolean | null
          organiser_id: string
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          gateway_config?: Json | null
          gateway_type?: string | null
          is_approved?: boolean | null
          organiser_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organiser_settings_organiser_id_fkey"
            columns: ["organiser_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          organiser_status: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          organiser_status?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          organiser_status?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scanner_assignments: {
        Row: {
          assigned_by: string
          created_at: string | null
          event_id: string
          id: string
          scanner_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string | null
          event_id: string
          id?: string
          scanner_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string | null
          event_id?: string
          id?: string
          scanner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scanner_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scanner_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scanner_assignments_scanner_id_fkey"
            columns: ["scanner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          name: string
          price: number
          sale_ends_at: string | null
          sale_starts_at: string | null
          sold_quantity: number
          total_quantity: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          name: string
          price?: number
          sale_ends_at?: string | null
          sale_starts_at?: string | null
          sold_quantity?: number
          total_quantity: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          price?: number
          sale_ends_at?: string | null
          sale_starts_at?: string | null
          sold_quantity?: number
          total_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string | null
          event_id: string
          id: string
          order_id: string
          qr_token: string
          status: string
          tier_id: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          order_id: string
          qr_token: string
          status?: string
          tier_id: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          order_id?: string
          qr_token?: string
          status?: string
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
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
      increment_sold_quantity: {
        Args: { p_qty: number; p_tier_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_organiser: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

// ── Convenience row types (used throughout the app) ──────────────────────────
export type UserRole = "user" | "organiser" | "scanner" | "admin";
export type EventStatus = "draft" | "pending" | "approved" | "published" | "cancelled" | "completed";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";
export type TicketStatus = "valid" | "used" | "cancelled" | "refunded";
export type GatewayType = "stripe" | "jazzcash" | "easypaisa" | "custom";
export type SlotType = "homepage_hero" | "homepage_grid" | "category_top" | "search_boost";
export type EventCategory =
  | "music" | "food" | "sports" | "arts" | "comedy"
  | "networking" | "conference" | "festival" | "nightlife" | "family" | "tech" | "general";

// Override nullable timestamps — all these columns have DB defaults so they
// are never null at runtime. The CLI generates `string | null` because it
// can't detect NOT NULL + DEFAULT, so we tighten them here.
type NonNullTimestamps<T, K extends keyof T> = Omit<T, K> & { [P in K]: string };

type _Profile       = Database["public"]["Tables"]["profiles"]["Row"];
type _Event         = Database["public"]["Tables"]["events"]["Row"];
type _TicketTier    = Database["public"]["Tables"]["ticket_tiers"]["Row"];
type _Order         = Database["public"]["Tables"]["orders"]["Row"];
type _Ticket        = Database["public"]["Tables"]["tickets"]["Row"];
type _FeaturedSlot  = Database["public"]["Tables"]["featured_slots"]["Row"];
type _ScannerAssignment    = Database["public"]["Tables"]["scanner_assignments"]["Row"];
type _OrganiserSettings    = Database["public"]["Tables"]["organiser_settings"]["Row"];
type _OrganiserApplication = Database["public"]["Tables"]["organiser_applications"]["Row"];

export type Profile       = NonNullTimestamps<_Profile,       "created_at" | "updated_at">;
export type Event         = NonNullTimestamps<_Event,         "created_at" | "updated_at">;
export type TicketTier    = NonNullTimestamps<_TicketTier,    "created_at">;
export type Order         = NonNullTimestamps<_Order,         "created_at" | "updated_at">;
export type Ticket        = NonNullTimestamps<_Ticket,        "created_at">;
export type FeaturedSlot  = NonNullTimestamps<_FeaturedSlot,  "created_at">;
export type ScannerAssignment    = NonNullTimestamps<_ScannerAssignment,    "created_at">;
export type OrganiserSettings    = NonNullTimestamps<_OrganiserSettings,    "created_at" | "updated_at">;
export type OrganiserApplication = NonNullTimestamps<_OrganiserApplication, "created_at">;

// Joined types for UI
export type EventWithTiers       = Event & { ticket_tiers: TicketTier[] };
export type EventWithOrganiser   = Event & { profiles: Pick<Profile, "display_name" | "avatar_url"> };
export type TicketWithEvent      = Ticket & { events: Event; ticket_tiers: TicketTier };
