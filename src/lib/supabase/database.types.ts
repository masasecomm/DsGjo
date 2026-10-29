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
          description?: string;
          application_url?: string | null;
          status?: "draft" | "published" | "closed";
          created_at?: string;
          updated_at?: string;
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
          email: string;
          status: "active" | "unsubscribed";
          consent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          status?: "active" | "unsubscribed";
          consent_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
