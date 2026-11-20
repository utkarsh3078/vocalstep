
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "daily_practice": {
                  Row: {
                    "practice_date": string,"seconds": number,"sessions": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "practice_date": string,"seconds"?: number,"sessions"?: number,"user_id": string
                  }
                  Update: {
                    "practice_date"?: string,"seconds"?: number,"sessions"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"practice_sessions": {
                  Row: {
                    "active_seconds": number,"completed_at": string | null,"credited_until": string,"id": string,"last_active_at": string,"last_word_index": number,"progress": number,"sample_slug": string | null,"speech_id": string | null,"speech_version": number,"started_at": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_seconds"?: number,"completed_at"?: string | null,"credited_until"?: string,"id"?: string,"last_active_at"?: string,"last_word_index"?: number,"progress"?: number,"sample_slug"?: string | null,"speech_id"?: string | null,"speech_version"?: number,"started_at"?: string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "active_seconds"?: number,"completed_at"?: string | null,"credited_until"?: string,"id"?: string,"last_active_at"?: string,"last_word_index"?: number,"progress"?: number,"sample_slug"?: string | null,"speech_id"?: string | null,"speech_version"?: number,"started_at"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "practice_sessions_speech_id_fkey"
      columns: ["speech_id"]
isOneToOne: false
      referencedRelation: "speeches"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"last_difficulty": string | null,"last_language": string | null,"pref_font_size": number | null,"pref_line_height": number | null,"pref_theme": string | null,"pref_wpm": number | null,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"last_difficulty"?: string | null,"last_language"?: string | null,"pref_font_size"?: number | null,"pref_line_height"?: number | null,"pref_theme"?: string | null,"pref_wpm"?: number | null,"timezone"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"last_difficulty"?: string | null,"last_language"?: string | null,"pref_font_size"?: number | null,"pref_line_height"?: number | null,"pref_theme"?: string | null,"pref_wpm"?: number | null,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"speeches": {
                  Row: {
                    "content": string,"created_at": string,"deleted_at": string | null,"difficulty": string,"id": string,"language": string,"model": string | null,"status": string,"target_minutes": number,"title": string | null,"tokens_in": number,"tokens_out": number,"topic": string,"updated_at": string,"user_id": string,"version": number,"word_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: string,"created_at"?: string,"deleted_at"?: string | null,"difficulty": string,"id"?: string,"language": string,"model"?: string | null,"status"?: string,"target_minutes": number,"title"?: string | null,"tokens_in"?: number,"tokens_out"?: number,"topic": string,"updated_at"?: string,"user_id"?: string,"version"?: number,"word_count"?: number
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"deleted_at"?: string | null,"difficulty"?: string,"id"?: string,"language"?: string,"model"?: string | null,"status"?: string,"target_minutes"?: number,"title"?: string | null,"tokens_in"?: number,"tokens_out"?: number,"topic"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number,"word_count"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "record_practice":
{ Args: { "complete"?: boolean,"delta_seconds": number,"progress": number,"session_id": string,"word_index": number }; Returns: boolean
                           },
"speech_quota":
{ Args: Record<PropertyKey, never>; Returns: {
              "attempts_24h": number,"free_used": number,"global_24h": number
            }[]
                           },
"start_practice_session":
{ Args: { "target_sample"?: string,"target_speech"?: string,"user_timezone"?: string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
