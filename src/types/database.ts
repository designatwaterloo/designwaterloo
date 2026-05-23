export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      members: {
        Row: {
          id: string;
          auth_user_id: string | null;
          member_id: number;
          first_name: string;
          last_name: string;
          slug: string;
          profile_image_path: string | null;
          profile_image_url: string | null;
          school:
            | "University of Waterloo"
            | "Wilfrid Laurier University"
            | null;
          program: string | null;
          graduating_class: string | null;
          bio: string | null;
          public_email: string | null;
          school_email: string;
          instagram: string | null;
          twitter: string | null;
          linkedin: string | null;
          github: string | null;
          portfolio: string | null;
          behance: string | null;
          dribbble: string | null;
          specialties: string[];
          work_schedule: string[];
          onboarding_completed: boolean;
          is_approved: boolean;
          is_admin: boolean;
          review_status: "draft" | "pending_review" | "approved" | "rejected";
          rejection_feedback: string | null;
          rejected_at: string | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          first_name: string;
          last_name: string;
          slug: string;
          profile_image_path?: string | null;
          profile_image_url?: string | null;
          school?:
            | "University of Waterloo"
            | "Wilfrid Laurier University"
            | null;
          program?: string | null;
          graduating_class?: string | null;
          bio?: string | null;
          public_email?: string | null;
          school_email: string;
          instagram?: string | null;
          twitter?: string | null;
          linkedin?: string | null;
          github?: string | null;
          portfolio?: string | null;
          behance?: string | null;
          dribbble?: string | null;
          specialties?: string[];
          work_schedule?: string[];
          onboarding_completed?: boolean;
          is_approved?: boolean;
          is_admin?: boolean;
          review_status?: "draft" | "pending_review" | "approved" | "rejected";
          rejection_feedback?: string | null;
          rejected_at?: string | null;
          submitted_at?: string | null;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          first_name?: string;
          last_name?: string;
          slug?: string;
          profile_image_path?: string | null;
          profile_image_url?: string | null;
          school?:
            | "University of Waterloo"
            | "Wilfrid Laurier University"
            | null;
          program?: string | null;
          graduating_class?: string | null;
          bio?: string | null;
          public_email?: string | null;
          school_email?: string;
          instagram?: string | null;
          twitter?: string | null;
          linkedin?: string | null;
          github?: string | null;
          portfolio?: string | null;
          behance?: string | null;
          dribbble?: string | null;
          specialties?: string[];
          work_schedule?: string[];
          onboarding_completed?: boolean;
          is_approved?: boolean;
          is_admin?: boolean;
          review_status?: "draft" | "pending_review" | "approved" | "rejected";
          rejection_feedback?: string | null;
          rejected_at?: string | null;
          submitted_at?: string | null;
        };
        Relationships: [];
      };
      member_experiences: {
        Row: {
          id: string;
          member_id: string;
          position_title: string | null;
          company: string;
          start_month: string | null;
          start_year: string | null;
          is_current: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          position_title?: string | null;
          company: string;
          start_month?: string | null;
          start_year?: string | null;
          is_current?: boolean;
          link?: string | null;
        };
        Update: {
          id?: string;
          member_id?: string;
          position_title?: string | null;
          company?: string;
          start_month?: string | null;
          start_year?: string | null;
          is_current?: boolean;
          link?: string | null;
        };
        Relationships: [];
      };
      member_leadership: {
        Row: {
          id: string;
          member_id: string;
          position_title: string | null;
          organization: string;
          start_month: string | null;
          start_year: string | null;
          is_current: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          position_title?: string | null;
          organization: string;
          start_month?: string | null;
          start_year?: string | null;
          is_current?: boolean;
          link?: string | null;
        };
        Update: {
          id?: string;
          member_id?: string;
          position_title?: string | null;
          organization?: string;
          start_month?: string | null;
          start_year?: string | null;
          is_current?: boolean;
          link?: string | null;
        };
        Relationships: [];
      };
      works: {
        Row: {
          id: string;
          member_id: string;
          slug: string;
          title: string;
          description: string | null;
          year: number | null;
          external_url: string | null;
          cover_image_url: string | null;
          images: WorkImage[];
          cover_aspect_ratio: number | null;
          review_status: "draft" | "pending_review" | "approved" | "rejected";
          rejection_feedback: string | null;
          submitted_at: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          slug: string;
          title: string;
          description?: string | null;
          year?: number | null;
          external_url?: string | null;
          cover_image_url?: string | null;
          images?: WorkImage[];
          cover_aspect_ratio?: number | null;
          review_status?: "draft" | "pending_review" | "approved" | "rejected";
          rejection_feedback?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          member_id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          year?: number | null;
          external_url?: string | null;
          cover_image_url?: string | null;
          images?: WorkImage[];
          cover_aspect_ratio?: number | null;
          review_status?: "draft" | "pending_review" | "approved" | "rejected";
          rejection_feedback?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          published_at?: string | null;
        };
        Relationships: [];
      };
    };
  };
}

// Stored shape of one image in `works.images` (jsonb array).
export interface WorkImage {
  url: string;
  aspectRatio: number;
  alt?: string;
}

// Review status
export type ReviewStatus = "draft" | "pending_review" | "approved" | "rejected";

// Convenience types
export type Member = Database["public"]["Tables"]["members"]["Row"];
export type MemberInsert = Database["public"]["Tables"]["members"]["Insert"];
export type MemberUpdate = Database["public"]["Tables"]["members"]["Update"];

export type MemberExperience =
  Database["public"]["Tables"]["member_experiences"]["Row"];
export type MemberExperienceInsert =
  Database["public"]["Tables"]["member_experiences"]["Insert"];

export type MemberLeadership =
  Database["public"]["Tables"]["member_leadership"]["Row"];
export type MemberLeadershipInsert =
  Database["public"]["Tables"]["member_leadership"]["Insert"];

export type Work = Database["public"]["Tables"]["works"]["Row"];
export type WorkInsert = Database["public"]["Tables"]["works"]["Insert"];
export type WorkUpdate = Database["public"]["Tables"]["works"]["Update"];

// Full member with relations
export interface MemberWithRelations extends Member {
  experiences: MemberExperience[];
  leadership: MemberLeadership[];
}

// A work with its author surfaced from the join — used in feed cards
// and detail pages so we don't need a second round-trip per item.
export interface WorkWithAuthor extends Work {
  author: Pick<Member, "id" | "slug" | "first_name" | "last_name" | "profile_image_url">;
}
