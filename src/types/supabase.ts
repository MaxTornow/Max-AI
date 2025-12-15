/**
 * Supabase database types
 * Generated types for the Supabase database
 *
 * Last verified against actual database: 2025-01-25
 * Tables in DB: profiles, styles, rewrites, invitations
 * Note: conversations and messages are defined for future use (currently using localStorage fallback)
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          preferences: {
            theme: 'light' | 'dark';
            notifications: boolean;
          } | null;
          role: string; // Added: exists in DB with default 'user'
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferences?: {
            theme: 'light' | 'dark';
            notifications: boolean;
          } | null;
          role?: string; // defaults to 'user'
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferences?: {
            theme: 'light' | 'dark';
            notifications: boolean;
          } | null;
          role?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          role: string;
          token: string;
          status: string; // 'sent' | 'accepted' | 'expired'
          expires_at: string;
          created_at: string;
          created_by: string;
          used_at: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          role: string;
          token: string;
          status?: string; // defaults to 'sent'
          expires_at: string;
          created_at?: string;
          created_by: string;
          used_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          role?: string;
          token?: string;
          status?: string;
          expires_at?: string;
          created_at?: string;
          created_by?: string;
          used_at?: string | null;
          user_id?: string | null;
        };
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          title: string;
          agent_type: 'ava' | 'vera' | 'lara' | 'lacy' | 'franck' | 'faris';
          is_archived: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          title: string;
          agent_type: 'ava' | 'vera' | 'lara' | 'lacy' | 'franck' | 'faris';
          is_archived?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          title?: string;
          agent_type?: 'ava' | 'vera' | 'lara' | 'lacy' | 'franck' | 'faris';
          is_archived?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          created_at: string;
          conversation_id: string;
          content: string;
          role: 'user' | 'assistant' | 'system';
          attachments: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          conversation_id: string;
          content: string;
          role: 'user' | 'assistant' | 'system';
          attachments?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          conversation_id?: string;
          content?: string;
          role?: 'user' | 'assistant' | 'system';
          attachments?: string[] | null;
        };
      };
      styles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          name: string;
          description: string | null;
          content: string;
          niche: string;
          target_audience: string;
          pain_points: string[];
          communication_style: string;
          hero_story: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          name: string;
          description?: string | null;
          content: string;
          niche: string;
          target_audience: string;
          pain_points: string[];
          communication_style: string;
          hero_story?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          content?: string;
          niche?: string;
          target_audience?: string;
          pain_points?: string[];
          communication_style?: string;
          hero_story?: string | null;
        };
      };
      rewrites: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          original_url: string;
          platform: 'tiktok' | 'instagram';
          variations: {
            id: string;
            content: string;
            created_at: string;
          }[];
          parameters: {
            niche: string;
            target_audience: string;
            pain_points: string[];
            communication_style: string;
            hero_story: string | null;
          };
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          original_url: string;
          platform: 'tiktok' | 'instagram';
          variations: {
            id: string;
            content: string;
            created_at: string;
          }[];
          parameters: {
            niche: string;
            target_audience: string;
            pain_points: string[];
            communication_style: string;
            hero_story: string | null;
          };
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          original_url?: string;
          platform?: 'tiktok' | 'instagram';
          variations?: {
            id: string;
            content: string;
            created_at: string;
          }[];
          parameters?: {
            niche: string;
            target_audience: string;
            pain_points: string[];
            communication_style: string;
            hero_story: string | null;
          };
        };
      };
      videos: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          title: string;
          original_filename: string;
          file_size_bytes: number | null;
          duration_seconds: number | null;
          original_storage_path: string;
          processed_storage_path: string | null;
          submagic_project_id: string | null;
          submagic_status: 'pending' | 'processing' | 'transcribing' | 'exporting' | 'completed' | 'failed';
          submagic_download_url: string | null;
          template_name: string;
          language: string;
          magic_zooms: boolean;
          magic_brolls: boolean;
          magic_brolls_percentage: number;
          error_message: string | null;
          retry_count: number;
          processing_started_at: string | null;
          processing_completed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          title: string;
          original_filename: string;
          file_size_bytes?: number | null;
          duration_seconds?: number | null;
          original_storage_path: string;
          processed_storage_path?: string | null;
          submagic_project_id?: string | null;
          submagic_status?: 'pending' | 'processing' | 'transcribing' | 'exporting' | 'completed' | 'failed';
          submagic_download_url?: string | null;
          template_name: string;
          language?: string;
          magic_zooms?: boolean;
          magic_brolls?: boolean;
          magic_brolls_percentage?: number;
          error_message?: string | null;
          retry_count?: number;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          title?: string;
          original_filename?: string;
          file_size_bytes?: number | null;
          duration_seconds?: number | null;
          original_storage_path?: string;
          processed_storage_path?: string | null;
          submagic_project_id?: string | null;
          submagic_status?: 'pending' | 'processing' | 'transcribing' | 'exporting' | 'completed' | 'failed';
          submagic_download_url?: string | null;
          template_name?: string;
          language?: string;
          magic_zooms?: boolean;
          magic_brolls?: boolean;
          magic_brolls_percentage?: number;
          error_message?: string | null;
          retry_count?: number;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};