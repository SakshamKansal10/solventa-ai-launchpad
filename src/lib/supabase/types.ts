// Hand-written to match supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once the Supabase CLI is linked to the project.
// Shape must structurally satisfy postgrest-js's GenericSchema (Tables/Views/Functions,
// each table needs Row/Insert/Update/Relationships) or table lookups silently collapse to `never`.

// jsonb columns use this instead of Record<string, unknown> — TanStack Start's
// serializability check (seroval) rejects `unknown`, so the shape must be a
// concrete recursive JSON type. Cast app-side types with `as unknown as Json`
// at insert/select boundaries.
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      business_dna: {
        Row: {
          id: string;
          user_id: string;
          onboarding_answers: Json;
          normalized_signals: Json;
          founder_analysis: Json | null;
          ai_model: string | null;
          version: number;
          profile_hash: string | null;
          initial_ai_calls: number | null;
          generation_duration_ms: number | null;
          prompt_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["business_dna"]["Row"]> & {
          user_id: string;
          onboarding_answers: Json;
          normalized_signals: Json;
        };
        Update: Partial<Database["public"]["Tables"]["business_dna"]["Row"]>;
        Relationships: [];
      };
      opportunities: {
        Row: {
          id: string;
          user_id: string;
          business_dna_id: string;
          title: string;
          one_liner: string;
          who_for: string | null;
          fit_score: number;
          score_breakdown: Json;
          candidate: Json;
          status: "active" | "saved" | "dismissed" | "selected";
          dismiss_reason: string | null;
          batch_number: number;
          ai_model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["opportunities"]["Row"]> & {
          user_id: string;
          business_dna_id: string;
          title: string;
          one_liner: string;
          fit_score: number;
          score_breakdown: Json;
          candidate: Json;
        };
        Update: Partial<Database["public"]["Tables"]["opportunities"]["Row"]>;
        Relationships: [];
      };
      opportunity_details: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          detail: Json;
          ai_model: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["opportunity_details"]["Row"]> & {
          opportunity_id: string;
          user_id: string;
          detail: Json;
        };
        Update: Partial<Database["public"]["Tables"]["opportunity_details"]["Row"]>;
        Relationships: [];
      };
      opportunity_evidence: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          claim: string;
          label:
            | "strong_signal"
            | "early_signal"
            | "emerging"
            | "competitive"
            | "needs_validation"
            | "limited_evidence";
          source_title: string | null;
          source_url: string | null;
          retrieved_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["opportunity_evidence"]["Row"]> & {
          opportunity_id: string;
          user_id: string;
          claim: string;
          label: Database["public"]["Tables"]["opportunity_evidence"]["Row"]["label"];
        };
        Update: Partial<Database["public"]["Tables"]["opportunity_evidence"]["Row"]>;
        Relationships: [];
      };
      idea_feedback: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string;
          feedback: "interested" | "maybe_later" | "not_for_me" | "saved";
          reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["idea_feedback"]["Row"]> & {
          user_id: string;
          opportunity_id: string;
          feedback: Database["public"]["Tables"]["idea_feedback"]["Row"]["feedback"];
        };
        Update: Partial<Database["public"]["Tables"]["idea_feedback"]["Row"]>;
        Relationships: [];
      };
      roadmaps: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string;
          status: "available" | "active" | "archived";
          ai_model: string | null;
          activated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["roadmaps"]["Row"]> & {
          user_id: string;
          opportunity_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["roadmaps"]["Row"]>;
        Relationships: [];
      };
      roadmap_phases: {
        Row: {
          id: string;
          roadmap_id: string;
          user_id: string;
          order_index: number;
          key: string;
          title: string;
          description: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["roadmap_phases"]["Row"]> & {
          roadmap_id: string;
          user_id: string;
          order_index: number;
          key: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["roadmap_phases"]["Row"]>;
        Relationships: [];
      };
      roadmap_weeks: {
        Row: {
          id: string;
          phase_id: string;
          user_id: string;
          order_index: number;
          week_number: number;
          title: string;
          objective: string;
          status: "locked" | "active" | "completed";
          unlocked_at: string | null;
          completed_at: string | null;
          created_at: string;
          /** Populated only once this week's detail has actually been
           * generated (just-in-time, on unlock) — null for a locked week
           * that hasn't unlocked yet, or a pre-migration roadmap. */
          mission: string | null;
          mistakes_to_avoid: Json | null;
          evidence_required: string | null;
          success_threshold: string | null;
          /** The founder's own short reflection on finishing this week —
           * the real signal fed into generating the NEXT week's detail. */
          founder_reflection: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["roadmap_weeks"]["Row"]> & {
          phase_id: string;
          user_id: string;
          order_index: number;
          week_number: number;
          title: string;
          objective: string;
        };
        Update: Partial<Database["public"]["Tables"]["roadmap_weeks"]["Row"]>;
        Relationships: [];
      };
      roadmap_tasks: {
        Row: {
          id: string;
          phase_id: string;
          week_id: string | null;
          user_id: string;
          order_index: number;
          what: string;
          why: string;
          how: string;
          resource: string | null;
          time_estimate: string | null;
          deadline: string | null;
          deadline_days_from_start: number;
          required: boolean;
          depends_on: string | null;
          done_when: string;
          status: "pending" | "in_progress" | "done" | "blocked";
          blocked_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["roadmap_tasks"]["Row"]> & {
          phase_id: string;
          user_id: string;
          order_index: number;
          what: string;
          why: string;
          how: string;
          done_when: string;
        };
        Update: Partial<Database["public"]["Tables"]["roadmap_tasks"]["Row"]>;
        Relationships: [];
      };
      mentor_conversations: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["mentor_conversations"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["mentor_conversations"]["Row"]>;
        Relationships: [];
      };
      mentor_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["mentor_messages"]["Row"]> & {
          conversation_id: string;
          user_id: string;
          role: Database["public"]["Tables"]["mentor_messages"]["Row"]["role"];
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["mentor_messages"]["Row"]>;
        Relationships: [];
      };
      founder_evidence: {
        Row: {
          id: string;
          user_id: string;
          opportunity_id: string;
          category:
            | "problem"
            | "customer"
            | "demand"
            | "price"
            | "competition"
            | "product"
            | "channel"
            | "economics";
          entry_type: "interview" | "note" | "observation";
          customer_type: string | null;
          interview_date: string | null;
          key_quote: string | null;
          pain_severity: "low" | "medium" | "high" | null;
          existing_workaround: string | null;
          willingness_to_pay: "no" | "maybe" | "yes" | null;
          content: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["founder_evidence"]["Row"]> & {
          user_id: string;
          opportunity_id: string;
          category: Database["public"]["Tables"]["founder_evidence"]["Row"]["category"];
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["founder_evidence"]["Row"]>;
        Relationships: [];
      };
      research_cache: {
        Row: {
          cache_key: string;
          query: string;
          result: Json;
          sources: Json[];
          retrieved_at: string;
          expires_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["research_cache"]["Row"]> & {
          cache_key: string;
          query: string;
          result: Json;
          expires_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["research_cache"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
