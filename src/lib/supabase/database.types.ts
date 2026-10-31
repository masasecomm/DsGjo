export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: "member" | "admin";
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: "member" | "admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          role?: "member" | "admin";
          created_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          title: string;
          slug: string;
          department: string | null;
          location: string | null;
          closing_date: string | null;
          reference_number: string | null;
          province: string | null;
          employment_type: string | null;
          salary_text: string | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string | null;
          job_level: string | null;
          dpsa_post_number: string | null;
          source_url: string | null;
          source_published_at: string | null;
          structured_details: Json;
          description: string;
          application_url: string | null;
          status: "draft" | "published" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          department?: string | null;
          location?: string | null;
          closing_date?: string | null;
          reference_number?: string | null;
          province?: string | null;
          employment_type?: string | null;
          salary_text?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string | null;
          job_level?: string | null;
          dpsa_post_number?: string | null;
          source_url?: string | null;
          source_published_at?: string | null;
          structured_details?: Json;
          description: string;
          application_url?: string | null;
          status?: "draft" | "published" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          department?: string | null;
          location?: string | null;
          closing_date?: string | null;
          reference_number?: string | null;
          province?: string | null;
          employment_type?: string | null;
          salary_text?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string | null;
          job_level?: string | null;
          dpsa_post_number?: string | null;
          source_url?: string | null;
          source_published_at?: string | null;
          structured_details?: Json;
          description?: string;
          application_url?: string | null;
          status?: "draft" | "published" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      imported_dpsa_circulars: {
        Row: {
          year: number;
          circular_number: number;
          source_pdf_url: string;
          imported_at: string;
          job_count: number;
        };
        Insert: {
          year: number;
          circular_number: number;
          source_pdf_url: string;
          imported_at?: string;
          job_count: number;
        };
        Update: {
          year?: number;
          circular_number?: number;
          source_pdf_url?: string;
          imported_at?: string;
          job_count?: number;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          job_id: string;
          author_name: string;
          content: string;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          author_name: string;
          content: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          author_name?: string;
          content?: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_alert_subscribers: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          status: "active" | "unsubscribed";
          consent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          email: string;
          status?: "active" | "unsubscribed";
          consent_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string;
          status?: "active" | "unsubscribed";
          consent_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      import_dpsa_circular_jobs: {
        Args: {
          p_year: number;
          p_circular_number: number;
          p_pdf_url: string;
          p_jobs: Json;
        };
        Returns: number;
      };
      get_popular_job_searches: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          search_term: string;
          search_count: number;
        }[];
      };
      record_public_job_search: {
        Args: {
          p_search_term: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
