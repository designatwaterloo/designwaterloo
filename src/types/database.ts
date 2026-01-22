export interface Database {
  public: {
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
        };
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
        };
        Update: {
          id?: string;
          member_id?: string;
          position_title?: string | null;
          company?: string;
          start_month?: string | null;
          start_year?: string | null;
          is_current?: boolean;
        };
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
        };
        Update: {
          id?: string;
          member_id?: string;
          position_title?: string | null;
          organization?: string;
          start_month?: string | null;
          start_year?: string | null;
          is_current?: boolean;
        };
      };
    };
  };
}

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

// Full member with relations
export interface MemberWithRelations extends Member {
  experiences: MemberExperience[];
  leadership: MemberLeadership[];
}
