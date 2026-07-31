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
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          kind: string
          message: string | null
          severity: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          message?: string | null
          severity?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          message?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      cancel_requests: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          order_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          order_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancel_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_logs: {
        Row: {
          created_at: string
          details: Json | null
          duration_ms: number | null
          id: string
          job_name: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          id?: string
          job_name: string
          status: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          id?: string
          job_name?: string
          status?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          charge: number
          created_at: string
          error_message: string | null
          id: string
          last_synced_at: string | null
          link: string
          quantity: number
          remains: number
          service_id: string | null
          service_name: string
          start_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          charge?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          link: string
          quantity: number
          remains?: number
          service_id?: string | null
          service_name: string
          start_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          charge?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          link?: string
          quantity?: number
          remains?: number
          service_id?: string | null
          service_name?: string
          start_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount: number
          created_at: string
          credited_at: string | null
          currency: string
          error_message: string | null
          gateway: string
          gateway_order_id: string
          gateway_payment_id: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credited_at?: string | null
          currency?: string
          error_message?: string | null
          gateway?: string
          gateway_order_id: string
          gateway_payment_id?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credited_at?: string | null
          currency?: string
          error_message?: string | null
          gateway?: string
          gateway_order_id?: string
          gateway_payment_id?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      provider_balance_logs: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          provider_id: string
        }
        Insert: {
          balance: number
          created_at?: string
          currency?: string
          id?: string
          provider_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_balance_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_logs: {
        Row: {
          action: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          provider_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number
          status_code: number | null
        }
        Insert: {
          action: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          provider_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number
          status_code?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          provider_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_orders: {
        Row: {
          created_at: string
          id: string
          order_id: string
          provider_id: string | null
          provider_order_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          provider_id?: string | null
          provider_order_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          provider_id?: string | null
          provider_order_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          cancel_supported: boolean
          category: string
          created_at: string
          id: string
          is_available: boolean
          last_imported_at: string
          max_quantity: number
          min_quantity: number
          name: string
          provider_id: string
          provider_service_id: string
          rate: number
          refill_supported: boolean
          type: string
          updated_at: string
        }
        Insert: {
          cancel_supported?: boolean
          category?: string
          created_at?: string
          id?: string
          is_available?: boolean
          last_imported_at?: string
          max_quantity?: number
          min_quantity?: number
          name: string
          provider_id: string
          provider_service_id: string
          rate?: number
          refill_supported?: boolean
          type?: string
          updated_at?: string
        }
        Update: {
          cancel_supported?: boolean
          category?: string
          created_at?: string
          id?: string
          is_available?: boolean
          last_imported_at?: string
          max_quantity?: number
          min_quantity?: number
          name?: string
          provider_id?: string
          provider_service_id?: string
          rate?: number
          refill_supported?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          api_key_encrypted: string
          api_url: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          last_balance: number | null
          last_balance_at: string | null
          last_checked_at: string | null
          last_error: string | null
          name: string
          priority: number
          timeout_ms: number
          updated_at: string
        }
        Insert: {
          api_key_encrypted: string
          api_url: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_balance?: number | null
          last_balance_at?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          name: string
          priority?: number
          timeout_ms?: number
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string
          api_url?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_balance?: number | null
          last_balance_at?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          name?: string
          priority?: number
          timeout_ms?: number
          updated_at?: string
        }
        Relationships: []
      }
      refill_requests: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          order_id: string
          provider_refill_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          order_id: string
          provider_refill_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string
          provider_refill_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refill_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          cancel_supported: boolean
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          markup_type: string
          markup_value: number
          max_quantity: number
          min_quantity: number
          name: string
          platform: string
          provider_id: string | null
          provider_service_id: string | null
          refill_supported: boolean
          selling_rate: number
          updated_at: string
        }
        Insert: {
          cancel_supported?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          markup_type?: string
          markup_value?: number
          max_quantity?: number
          min_quantity?: number
          name: string
          platform?: string
          provider_id?: string | null
          provider_service_id?: string | null
          refill_supported?: boolean
          selling_rate?: number
          updated_at?: string
        }
        Update: {
          cancel_supported?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          markup_type?: string
          markup_value?: number
          max_quantity?: number
          min_quantity?: number
          name?: string
          platform?: string
          provider_id?: string | null
          provider_service_id?: string | null
          refill_supported?: boolean
          selling_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_with_debit: {
        Args: {
          _link: string
          _quantity: number
          _service_id: string
          _user_id: string
        }
        Returns: string
      }
      credit_wallet_from_payment: {
        Args: {
          _amount: number
          _gateway: string
          _gateway_order_id: string
          _gateway_payment_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refund_order: {
        Args: { _order_id: string; _reason: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
