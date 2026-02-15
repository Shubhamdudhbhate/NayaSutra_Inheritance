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
  public: {
    Tables: {
      case_diary: {
        Row: {
          action: string
          actor_id: string
          case_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id: string
          case_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          case_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_diary_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_diary_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_evidence: {
        Row: {
          case_id: string
          category: Database["public"]["Enums"]["evidence_file_type"]
          cid: string
          created_at: string
          file_name: string
          id: string
          uploaded_by: string
        }
        Insert: {
          case_id: string
          category: Database["public"]["Enums"]["evidence_file_type"]
          cid: string
          created_at?: string
          file_name: string
          id?: string
          uploaded_by: string
        }
        Update: {
          case_id?: string
          category?: Database["public"]["Enums"]["evidence_file_type"]
          cid?: string
          created_at?: string
          file_name?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_evidence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          assigned_judge_id: string | null
          blockchain_tx_hash: string
          case_number: string
          case_type: Database["public"]["Enums"]["case_type"]
          clerk_id: string | null
          court_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          filing_date: string | null
          fir_id: string | null
          id: string
          is_on_chain: boolean | null
          lawyer_party_a_id: string | null
          lawyer_party_b_id: string | null
          next_hearing_date: string | null
          on_chain_case_id: string
          party_a_name: string
          party_b_name: string
          priority: string | null
          section_id: string | null
          status: Database["public"]["Enums"]["case_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_judge_id?: string | null
          blockchain_tx_hash: string
          case_number: string
          case_type: Database["public"]["Enums"]["case_type"]
          clerk_id?: string | null
          court_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          filing_date?: string | null
          fir_id?: string | null
          id?: string
          is_on_chain?: boolean | null
          lawyer_party_a_id?: string | null
          lawyer_party_b_id?: string | null
          next_hearing_date?: string | null
          on_chain_case_id: string
          party_a_name: string
          party_b_name: string
          priority?: string | null
          section_id?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_judge_id?: string | null
          blockchain_tx_hash?: string
          case_number?: string
          case_type?: Database["public"]["Enums"]["case_type"]
          clerk_id?: string | null
          court_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          filing_date?: string | null
          fir_id?: string | null
          id?: string
          is_on_chain?: boolean | null
          lawyer_party_a_id?: string | null
          lawyer_party_b_id?: string | null
          next_hearing_date?: string | null
          on_chain_case_id?: string
          party_a_name?: string
          party_b_name?: string
          priority?: string | null
          section_id?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_assigned_judge_id_fkey"
            columns: ["assigned_judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_clerk_id_fkey"
            columns: ["clerk_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_fir_id_fkey"
            columns: ["fir_id"]
            isOneToOne: false
            referencedRelation: "firs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_lawyer_party_a_id_fkey"
            columns: ["lawyer_party_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_lawyer_party_b_id_fkey"
            columns: ["lawyer_party_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_of_custody: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          evidence_id: string
          id: string
          ip_address: string | null
          performed_by: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          evidence_id: string
          id?: string
          ip_address?: string | null
          performed_by: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          evidence_id?: string
          id?: string
          ip_address?: string | null
          performed_by?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_of_custody_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_of_custody_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          state: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          state?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          state?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      evidence: {
        Row: {
          case_id: string
          category: Database["public"]["Enums"]["evidence_category"]
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_sealed: boolean | null
          mime_type: string | null
          sealed_at: string | null
          sealed_by: string | null
          status: Database["public"]["Enums"]["evidence_status"] | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          case_id: string
          category?: Database["public"]["Enums"]["evidence_category"]
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_sealed?: boolean | null
          mime_type?: string | null
          sealed_at?: string | null
          sealed_by?: string | null
          status?: Database["public"]["Enums"]["evidence_status"] | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          case_id?: string
          category?: Database["public"]["Enums"]["evidence_category"]
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_sealed?: boolean | null
          mime_type?: string | null
          sealed_at?: string | null
          sealed_by?: string | null
          status?: Database["public"]["Enums"]["evidence_status"] | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_sealed_by_fkey"
            columns: ["sealed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      firs: {
        Row: {
          accused_name: string | null
          blockchain_tx_hash: string
          bns_section: string
          content_hash: string | null
          created_at: string
          description: string | null
          fir_number: string
          id: string
          incident_date: string
          incident_place: string
          informant_contact: string
          informant_name: string
          ipfs_cid: string
          is_on_chain: boolean | null
          offense_nature: string
          officer_id: string | null
          police_station: string
          status: Database["public"]["Enums"]["fir_status"]
          updated_at: string
          victim_name: string
        }
        Insert: {
          accused_name?: string | null
          blockchain_tx_hash: string
          bns_section: string
          content_hash?: string | null
          created_at?: string
          description?: string | null
          fir_number: string
          id?: string
          incident_date: string
          incident_place: string
          informant_contact: string
          informant_name: string
          ipfs_cid: string
          is_on_chain?: boolean | null
          offense_nature: string
          officer_id?: string | null
          police_station: string
          status?: Database["public"]["Enums"]["fir_status"]
          updated_at?: string
          victim_name: string
        }
        Update: {
          accused_name?: string | null
          blockchain_tx_hash?: string
          bns_section?: string
          content_hash?: string | null
          created_at?: string
          description?: string | null
          fir_number?: string
          id?: string
          incident_date?: string
          incident_place?: string
          informant_contact?: string
          informant_name?: string
          ipfs_cid?: string
          is_on_chain?: boolean | null
          offense_nature?: string
          officer_id?: string | null
          police_station?: string
          status?: Database["public"]["Enums"]["fir_status"]
          updated_at?: string
          victim_name?: string
        }
        Relationships: []
      }
      investigation_files: {
        Row: {
          file_type: Database["public"]["Enums"]["investigation_file_type"]
          file_url: string
          fir_id: string
          id: string
          notes: string | null
          uploaded_at: string
        }
        Insert: {
          file_type: Database["public"]["Enums"]["investigation_file_type"]
          file_url: string
          fir_id: string
          id?: string
          notes?: string | null
          uploaded_at?: string
        }
        Update: {
          file_type?: Database["public"]["Enums"]["investigation_file_type"]
          file_url?: string
          fir_id?: string
          id?: string
          notes?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigation_files_fir_id_fkey"
            columns: ["fir_id"]
            isOneToOne: false
            referencedRelation: "firs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          case_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string | null
          requires_confirmation: boolean | null
          session_id: string | null
          signature: string | null
          title: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string | null
          requires_confirmation?: boolean | null
          session_id?: string | null
          signature?: string | null
          title: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string | null
          requires_confirmation?: boolean | null
          session_id?: string | null
          signature?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_backup: {
        Row: {
          created_at: string | null
          id: string | null
          is_read: boolean | null
          message: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_read?: boolean | null
          message?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_read?: boolean | null
          message?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      permission_requests: {
        Row: {
          case_id: string
          created_at: string
          id: string
          requested_at: string
          requester_id: string
          responded_at: string | null
          responded_by: string | null
          session_id: string
          status: Database["public"]["Enums"]["permission_status"]
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          requested_at?: string
          requester_id: string
          responded_at?: string | null
          responded_by?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["permission_status"]
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          requested_at?: string
          requester_id?: string
          responded_at?: string | null
          responded_by?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["permission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "permission_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_field: string
          id: string
          new_value: string | null
          old_value: string | null
          profile_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bar_council_number: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_verified: boolean | null
          is_wallet_verified: boolean | null
          last_login_at: string | null
          last_logout_at: string | null
          nonce: string | null
          phone: string | null
          role_category: Database["public"]["Enums"]["user_role_category"]
          status: string | null
          updated_at: string
          user_id: string | null
          wallet_address: string | null
          wallet_verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bar_council_number?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_verified?: boolean | null
          is_wallet_verified?: boolean | null
          last_login_at?: string | null
          last_logout_at?: string | null
          nonce?: string | null
          phone?: string | null
          role_category?: Database["public"]["Enums"]["user_role_category"]
          status?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
          wallet_verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bar_council_number?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_verified?: boolean | null
          is_wallet_verified?: boolean | null
          last_login_at?: string | null
          last_logout_at?: string | null
          nonce?: string | null
          phone?: string | null
          role_category?: Database["public"]["Enums"]["user_role_category"]
          status?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
          wallet_verified_at?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          code: string
          court_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          presiding_judge_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          court_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          presiding_judge_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          court_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          presiding_judge_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_presiding_judge_id_fkey"
            columns: ["presiding_judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_confirmations: {
        Row: {
          confirmed: boolean | null
          confirmed_at: string | null
          created_at: string | null
          id: string
          participant_id: string
          session_id: string
          updated_at: string | null
        }
        Insert: {
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          participant_id: string
          session_id: string
          updated_at?: string | null
        }
        Update: {
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          participant_id?: string
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_confirmations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_confirmations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_logs: {
        Row: {
          case_id: string
          created_at: string
          ended_at: string | null
          finalization_cid: string | null
          id: string
          judge_id: string
          judge_verdict_cid: string | null
          notes: string | null
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          transcript_cid: string | null
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          ended_at?: string | null
          finalization_cid?: string | null
          id?: string
          judge_id: string
          judge_verdict_cid?: string | null
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          transcript_cid?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          ended_at?: string | null
          finalization_cid?: string | null
          id?: string
          judge_id?: string
          judge_verdict_cid?: string | null
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          transcript_cid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_logs_backup: {
        Row: {
          case_id: string | null
          created_at: string | null
          ended_at: string | null
          id: string | null
          judge_id: string | null
          notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          updated_at: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string | null
          judge_id?: string | null
          notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          updated_at?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string | null
          judge_id?: string | null
          notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staging_evidence: {
        Row: {
          case_id: string
          evidence_status:
            | Database["public"]["Enums"]["evidence_status_type"]
            | null
          file_type: Database["public"]["Enums"]["evidence_file_type"]
          file_url: string
          id: string
          upload_timestamp: string | null
          uploader_role: Database["public"]["Enums"]["uploader_role_type"]
          uploader_uuid: string
        }
        Insert: {
          case_id: string
          evidence_status?:
            | Database["public"]["Enums"]["evidence_status_type"]
            | null
          file_type: Database["public"]["Enums"]["evidence_file_type"]
          file_url: string
          id?: string
          upload_timestamp?: string | null
          uploader_role: Database["public"]["Enums"]["uploader_role_type"]
          uploader_uuid: string
        }
        Update: {
          case_id?: string
          evidence_status?:
            | Database["public"]["Enums"]["evidence_status_type"]
            | null
          file_type?: Database["public"]["Enums"]["evidence_file_type"]
          file_url?: string
          id?: string
          upload_timestamp?: string | null
          uploader_role?: Database["public"]["Enums"]["uploader_role_type"]
          uploader_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "staging_evidence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staging_evidence_uploader_uuid_fkey"
            columns: ["uploader_uuid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_value: string | null
          old_value: string | null
          profile_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      notification_stats: {
        Row: {
          completed_confirmations: number | null
          pending_confirmations: number | null
          total_notifications: number | null
          unread_notifications: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role_details: {
        Args: { p_user_id: string }
        Returns: {
          designation: string
          full_name: string
          is_verified: boolean
          professional_id: string
          role: string
          role_category: string
          specialization: string
          user_id: string
          wallet_address: string
        }[]
      }
      get_users_by_role: {
        Args: { p_role_category: string }
        Returns: {
          created_at: string
          designation: string
          email: string
          full_name: string
          id: string
          is_verified: boolean
          user_id: string
          wallet_address: string
        }[]
      }
      verify_user_login: {
        Args: { _signature: string; _wallet: string }
        Returns: Json
      }
      verify_wallet: {
        Args: { p_user_id: string; p_wallet_address: string }
        Returns: boolean
      }
    }
    Enums: {
      case_status:
        | "pending"
        | "active"
        | "hearing"
        | "verdict_pending"
        | "closed"
        | "appealed"
        | "archived"
      case_type: "criminal" | "civil" | "constitutional" | "corporate"
      evidence_category:
        | "document"
        | "video"
        | "audio"
        | "image"
        | "forensic"
        | "other"
      evidence_file_type: "DOCUMENT" | "AUDIO" | "VIDEO" | "IMAGE" | "OTHER"
      evidence_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "sealed"
      evidence_status_type: "PENDING" | "APPROVED" | "REJECTED"
      fir_status:
        | "Registered"
        | "Under Investigation"
        | "Chargesheet Filed"
        | "Closed"
      investigation_file_type:
        | "Supplementary Chargesheet"
        | "Forensic Report"
        | "Witness Statement"
      permission_status: "pending" | "granted" | "denied" | "expired"
      session_status: "active" | "ended" | "paused"
      uploader_role_type: "POLICE" | "LAWYER"
      user_role_category:
        | "judge"
        | "lawyer"
        | "police"
        | "court_staff"
        | "public_party"
    }
    CompositeTypes: {
      auth_response: {
        token: string | null
        user_id: string | null
        role: string | null
      }
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
      case_status: [
        "pending",
        "active",
        "hearing",
        "verdict_pending",
        "closed",
        "appealed",
        "archived",
      ],
      case_type: ["criminal", "civil", "constitutional", "corporate"],
      evidence_category: [
        "document",
        "video",
        "audio",
        "image",
        "forensic",
        "other",
      ],
      evidence_file_type: ["DOCUMENT", "AUDIO", "VIDEO", "IMAGE", "OTHER"],
      evidence_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "sealed",
      ],
      evidence_status_type: ["PENDING", "APPROVED", "REJECTED"],
      fir_status: [
        "Registered",
        "Under Investigation",
        "Chargesheet Filed",
        "Closed",
      ],
      investigation_file_type: [
        "Supplementary Chargesheet",
        "Forensic Report",
        "Witness Statement",
      ],
      permission_status: ["pending", "granted", "denied", "expired"],
      session_status: ["active", "ended", "paused","scheduled"],
      uploader_role_type: ["POLICE", "LAWYER"],
      user_role_category: [
        "judge",
        "lawyer",
        "police",
        "court_staff",
        "public_party",
      ],
    },
  },
} as const
