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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          badge_name: string
          created_at: string | null
          criteria_type: string
          criteria_value: number
          description: string | null
          icon_url: string | null
          id: string
        }
        Insert: {
          badge_name: string
          created_at?: string | null
          criteria_type: string
          criteria_value: number
          description?: string | null
          icon_url?: string | null
          id?: string
        }
        Update: {
          badge_name?: string
          created_at?: string | null
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon_url?: string | null
          id?: string
        }
        Relationships: []
      }
      button_holds: {
        Row: {
          context_id: string | null
          context_type: string | null
          country: string | null
          device_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_active: boolean | null
          last_heartbeat: string
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          country?: string | null
          device_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          country?: string | null
          device_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_boost_limits: {
        Row: {
          boost_count: number
          boost_date: string
          id: string
          max_boosts: number
          user_id: string
        }
        Insert: {
          boost_count?: number
          boost_date?: string
          id?: string
          max_boosts?: number
          user_id: string
        }
        Update: {
          boost_count?: number
          boost_date?: string
          id?: string
          max_boosts?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_push_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          order_index: number | null
          poll_id: string
          votes: number | null
          votes_cache: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_text: string
          order_index?: number | null
          poll_id: string
          votes?: number | null
          votes_cache?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_text?: string
          order_index?: number | null
          poll_id?: string
          votes?: number | null
          votes_cache?: number | null
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
      poll_vote_holds: {
        Row: {
          device_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_active: boolean | null
          last_heartbeat: string | null
          option_id: string | null
          poll_id: string | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          device_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          option_id?: string | null
          poll_id?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          device_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          option_id?: string | null
          poll_id?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_vote_holds_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_vote_holds_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_vote_holds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          boost_count: number | null
          boost_count_cache: number | null
          created_at: string | null
          created_by: string
          creator_username: string
          expires_at: string | null
          id: string
          is_anonymous: boolean | null
          question: string
          status: Database["public"]["Enums"]["poll_status"] | null
          total_votes: number | null
          total_votes_cache: number | null
          updated_at: string | null
          votes_received_count: number | null
        }
        Insert: {
          boost_count?: number | null
          boost_count_cache?: number | null
          created_at?: string | null
          created_by: string
          creator_username: string
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          question: string
          status?: Database["public"]["Enums"]["poll_status"] | null
          total_votes?: number | null
          total_votes_cache?: number | null
          updated_at?: string | null
          votes_received_count?: number | null
        }
        Update: {
          boost_count?: number | null
          boost_count_cache?: number | null
          created_at?: string | null
          created_by?: string
          creator_username?: string
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          question?: string
          status?: Database["public"]["Enums"]["poll_status"] | null
          total_votes?: number | null
          total_votes_cache?: number | null
          updated_at?: string | null
          votes_received_count?: number | null
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
      user_badges: {
        Row: {
          badge_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_boosts: {
        Row: {
          boosted_at: string | null
          id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          boosted_at?: string | null
          id?: string
          poll_id: string
          user_id: string
        }
        Update: {
          boosted_at?: string | null
          id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pushes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pushes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string | null
          followed_id: string | null
          follower_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          followed_id?: string | null
          follower_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          followed_id?: string | null
          follower_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string
          voted_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id: string
          voted_at?: string | null
        }
        Update: {
          created_at?: string | null
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
      archive_expired_polls: { Args: never; Returns: undefined }
      cleanup_button_hold_sessions: { Args: never; Returns: undefined }
      cleanup_poll_vote_sessions: { Args: never; Returns: undefined }
      generate_poll_id: { Args: never; Returns: string }
      get_user_stats: {
        Args: { user_uuid: string }
        Returns: {
          boosts_received: number
          created_polls: number
          followers_count: number
          following_count: number
          votes_cast: number
          votes_received: number
        }[]
      }
      validate_poll_input: {
        Args: { option_texts: string[]; question_text: string }
        Returns: boolean
      }
    }
    Enums: {
      poll_status: "active" | "archived"
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
      poll_status: ["active", "archived"],
    },
  },
} as const
