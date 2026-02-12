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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      application_tags: {
        Row: {
          application_id: string
          tag_id: string
        }
        Insert: {
          application_id: string
          tag_id: string
        }
        Update: {
          application_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_tags_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          company_name: string
          company_size: string | null
          company_website: string | null
          compensation_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_role: string | null
          cover_letter_id: string | null
          cover_letter_notes: string | null
          date_added: string | null
          date_applied: string | null
          follow_up_date: string | null
          id: string
          job_description_raw: string | null
          job_title: string
          job_url: string | null
          location_city: string | null
          location_country: string | null
          match_score: number | null
          notes: string | null
          priority: string | null
          resume_id: string | null
          resume_version: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_not_specified: boolean | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          work_mode: string | null
        }
        Insert: {
          company_name: string
          company_size?: string | null
          company_website?: string | null
          compensation_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_role?: string | null
          cover_letter_id?: string | null
          cover_letter_notes?: string | null
          date_added?: string | null
          date_applied?: string | null
          follow_up_date?: string | null
          id?: string
          job_description_raw?: string | null
          job_title: string
          job_url?: string | null
          location_city?: string | null
          location_country?: string | null
          match_score?: number | null
          notes?: string | null
          priority?: string | null
          resume_id?: string | null
          resume_version?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_not_specified?: boolean | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          work_mode?: string | null
        }
        Update: {
          company_name?: string
          company_size?: string | null
          company_website?: string | null
          compensation_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_role?: string | null
          cover_letter_id?: string | null
          cover_letter_notes?: string | null
          date_added?: string | null
          date_applied?: string | null
          follow_up_date?: string | null
          id?: string
          job_description_raw?: string | null
          job_title?: string
          job_url?: string | null
          location_city?: string | null
          location_country?: string | null
          match_score?: number | null
          notes?: string | null
          priority?: string | null
          resume_id?: string | null
          resume_version?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_not_specified?: boolean | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          work_mode?: string | null
        }
        Relationships: []
      }
      status_history: {
        Row: {
          application_id: string
          changed_at: string | null
          from_status: string | null
          id: string
          notes: string | null
          to_status: string
          user_id: string
        }
        Insert: {
          application_id: string
          changed_at?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status: string
          user_id: string
        }
        Update: {
          application_id?: string
          changed_at?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          anthropic_api_key: string | null
          created_at: string | null
          default_currency: string | null
          default_source: string | null
          default_work_mode: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          anthropic_api_key?: string | null
          created_at?: string | null
          default_currency?: string | null
          default_source?: string | null
          default_work_mode?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          anthropic_api_key?: string | null
          created_at?: string | null
          default_currency?: string | null
          default_source?: string | null
          default_work_mode?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
