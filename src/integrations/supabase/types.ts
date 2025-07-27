export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      button_holds: {
        Row: {
          country: string | null
          device_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_active: boolean | null
          last_heartbeat: string | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          device_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          device_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      hidden_polls: {
        Row: {
          hidden_at: string | null
          id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string | null
          id?: string
          poll_id: string
          user_id: string
        }
        Update: {
          hidden_at?: string | null
          id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_polls_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string | null
          id: string
          option_text: string
          poll_id: string
          votes: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_text: string
          poll_id: string
          votes?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_text?: string
          poll_id?: string
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string | null
          created_by: string
          creator_username: string
          expires_at: string | null
          id: string
          push_count: number | null
          question: string
          status: Database["public"]["Enums"]["poll_status"] | null
          total_votes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          creator_username: string
          expires_at?: string | null
          id?: string
          push_count?: number | null
          question: string
          status?: Database["public"]["Enums"]["poll_status"] | null
          total_votes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          creator_username?: string
          expires_at?: string | null
          id?: string
          push_count?: number | null
          question?: string
          status?: Database["public"]["Enums"]["poll_status"] | null
          total_votes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      saved_polls: {
        Row: {
          id: string
          poll_id: string
          saved_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          poll_id: string
          saved_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          poll_id?: string
          saved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_polls_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      user_votes: {
        Row: {
          id: string
          option_id: string
          poll_id: string
          user_id: string
          voted_at: string | null
        }
        Insert: {
          id?: string
          option_id: string
          poll_id: string
          user_id: string
          voted_at?: string | null
        }
        Update: {
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      poll_status: "active" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      poll_status: ["active", "archived"],
    },
  },
} as const
