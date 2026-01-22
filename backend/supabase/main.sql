-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.case_hearings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  hearing_date date NOT NULL,
  hearing_time time NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'::text,
  location text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT case_hearings_pkey PRIMARY KEY (id),
  CONSTRAINT case_hearings_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id),
  CONSTRAINT case_hearings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.case_diary (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid NOT NULL,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT case_diary_pkey PRIMARY KEY (id),
  CONSTRAINT case_diary_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id),
  CONSTRAINT case_diary_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.cases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  unique_identifier text NOT NULL,
  title text NOT NULL,
  description text,
  case_type USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::case_status,
  priority text DEFAULT 'normal'::text,
  party_a_name text NOT NULL,
  party_b_name text NOT NULL,
  court_name text,
  section_id uuid,
  assigned_judge_id uuid,
  clerk_id uuid,
  lawyer_party_a_id uuid,
  lawyer_party_b_id uuid,
  filing_date date DEFAULT CURRENT_DATE,
  next_hearing_date timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cases_pkey PRIMARY KEY (id),
  CONSTRAINT cases_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id),
  CONSTRAINT cases_assigned_judge_id_fkey FOREIGN KEY (assigned_judge_id) REFERENCES public.profiles(id),
  CONSTRAINT cases_clerk_id_fkey FOREIGN KEY (clerk_id) REFERENCES public.profiles(id),
  CONSTRAINT cases_lawyer_party_a_id_fkey FOREIGN KEY (lawyer_party_a_id) REFERENCES public.profiles(id),
  CONSTRAINT cases_lawyer_party_b_id_fkey FOREIGN KEY (lawyer_party_b_id) REFERENCES public.profiles(id),
  CONSTRAINT cases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.chain_of_custody (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid NOT NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chain_of_custody_pkey PRIMARY KEY (id),
  CONSTRAINT chain_of_custody_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.evidence(id),
  CONSTRAINT chain_of_custody_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.courts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  type text DEFAULT 'District Court'::text,
  address text,
  city text,
  state text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT courts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category USER-DEFINED NOT NULL DEFAULT 'document'::evidence_category,
  status USER-DEFINED DEFAULT 'pending_review'::evidence_status,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  is_sealed boolean DEFAULT false,
  sealed_by uuid,
  sealed_at timestamp with time zone,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT evidence_pkey PRIMARY KEY (id),
  CONSTRAINT evidence_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id),
  CONSTRAINT evidence_sealed_by_fkey FOREIGN KEY (sealed_by) REFERENCES public.profiles(id),
  CONSTRAINT evidence_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.firs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fir_number text NOT NULL UNIQUE,
  police_station text NOT NULL,
  informant_name text NOT NULL,
  informant_contact text NOT NULL,
  incident_date timestamp with time zone NOT NULL,
  incident_place text NOT NULL,
  offense_nature text NOT NULL,
  bns_section text NOT NULL,
  accused_name text,
  victim_name text NOT NULL,
  description text,
  status USER-DEFINED NOT NULL DEFAULT 'Registered'::fir_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  officer_id uuid,
  ipfs_cid text NOT NULL,
  content_hash text,
  blockchain_tx_hash text NOT NULL,
  is_on_chain boolean DEFAULT false,
  CONSTRAINT firs_pkey PRIMARY KEY (id),
  CONSTRAINT firs_officer_id_fkey FOREIGN KEY (officer_id) REFERENCES auth.users(id)
);
CREATE TABLE public.investigation_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fir_id uuid NOT NULL,
  file_url text NOT NULL,
  file_type USER-DEFINED NOT NULL,
  notes text,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT investigation_files_pkey PRIMARY KEY (id),
  CONSTRAINT investigation_files_fir_id_fkey FOREIGN KEY (fir_id) REFERENCES public.firs(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.permission_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  case_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::permission_status,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  responded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT permission_requests_pkey PRIMARY KEY (id),
  CONSTRAINT permission_requests_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.session_logs(id),
  CONSTRAINT permission_requests_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id),
  CONSTRAINT permission_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id),
  CONSTRAINT permission_requests_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  changed_field text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT profile_audit_log_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT profile_audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  email text,
  full_name text NOT NULL,
  avatar_url text,
  phone text,
  bar_council_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  wallet_address text UNIQUE,
  is_verified boolean DEFAULT false,
  department text,
  nonce text DEFAULT ('init_nonce_'::text || md5((random())::text)),
  last_login_at timestamp with time zone,
  last_logout_at timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text])),
  is_wallet_verified boolean DEFAULT false,
  wallet_verified_at timestamp with time zone,
  role_category USER-DEFINED NOT NULL DEFAULT 'public_party'::user_role_category,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  court_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  presiding_judge_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sections_pkey PRIMARY KEY (id),
  CONSTRAINT sections_court_id_fkey FOREIGN KEY (court_id) REFERENCES public.courts(id),
  CONSTRAINT sections_presiding_judge_id_fkey FOREIGN KEY (presiding_judge_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.session_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  judge_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'active'::session_status,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT session_logs_pkey PRIMARY KEY (id),
  CONSTRAINT session_logs_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id),
  CONSTRAINT session_logs_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.wallet_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wallet_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_audit_log_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT wallet_audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id)
);