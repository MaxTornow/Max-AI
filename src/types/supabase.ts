/**
 * Supabase database types
 * Generated types for the Supabase database
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