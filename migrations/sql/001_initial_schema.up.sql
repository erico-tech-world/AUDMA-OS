CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oidc_subject text NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_ci_idx ON users (lower(email));

CREATE TABLE roles (
  key text PRIMARY KEY CHECK (key IN (
    'SUPER_ADMIN', 'FINANCIAL_CONTROLLER', 'HR_DIRECTOR',
    'DEPARTMENT_HEAD', 'SENIOR_ACCOUNTANT', 'STAFF_EMPLOYEE'
  )),
  display_name text NOT NULL
);

CREATE TABLE permissions (
  key text PRIMARY KEY CHECK (key IN (
    'accounting:view', 'accounting:post_journal', 'accounting:approve_invoice',
    'accounting:view_reports', 'hrm:view', 'hrm:manage_employees',
    'hrm:approve_leave', 'hrm:run_payroll', 'receipts:view',
    'receipts:submit', 'receipts:approve', 'admin:providers', 'admin:audit_logs'
  )),
  description text NOT NULL
);

CREATE TABLE role_permissions (
  role_key text NOT NULL REFERENCES roles(key),
  permission_key text NOT NULL REFERENCES permissions(key),
  PRIMARY KEY (role_key, permission_key)
);

INSERT INTO roles (key, display_name) VALUES
  ('SUPER_ADMIN', 'Super Admin'),
  ('FINANCIAL_CONTROLLER', 'Financial Controller'),
  ('HR_DIRECTOR', 'HR Director'),
  ('DEPARTMENT_HEAD', 'Department Head'),
  ('SENIOR_ACCOUNTANT', 'Senior Accountant'),
  ('STAFF_EMPLOYEE', 'Staff Employee');

INSERT INTO permissions (key, description) VALUES
  ('accounting:view', 'View accounting data'),
  ('accounting:post_journal', 'Post general ledger journals'),
  ('accounting:approve_invoice', 'Approve accounts payable invoices'),
  ('accounting:view_reports', 'View accounting reports'),
  ('hrm:view', 'View workforce data'),
  ('hrm:manage_employees', 'Manage employee records'),
  ('hrm:approve_leave', 'Approve leave requests'),
  ('hrm:run_payroll', 'Run payroll'),
  ('receipts:view', 'View expense receipts'),
  ('receipts:submit', 'Submit expense receipts'),
  ('receipts:approve', 'Approve expense receipts'),
  ('admin:providers', 'Manage provider configuration'),
  ('admin:audit_logs', 'View audit logs');

INSERT INTO role_permissions (role_key, permission_key) VALUES
  ('SUPER_ADMIN', 'accounting:view'), ('SUPER_ADMIN', 'accounting:post_journal'),
  ('SUPER_ADMIN', 'accounting:approve_invoice'), ('SUPER_ADMIN', 'accounting:view_reports'),
  ('SUPER_ADMIN', 'hrm:view'), ('SUPER_ADMIN', 'hrm:manage_employees'),
  ('SUPER_ADMIN', 'hrm:approve_leave'), ('SUPER_ADMIN', 'hrm:run_payroll'),
  ('SUPER_ADMIN', 'receipts:view'), ('SUPER_ADMIN', 'receipts:submit'),
  ('SUPER_ADMIN', 'receipts:approve'), ('SUPER_ADMIN', 'admin:providers'),
  ('SUPER_ADMIN', 'admin:audit_logs'),
  ('FINANCIAL_CONTROLLER', 'accounting:view'), ('FINANCIAL_CONTROLLER', 'accounting:post_journal'),
  ('FINANCIAL_CONTROLLER', 'accounting:approve_invoice'), ('FINANCIAL_CONTROLLER', 'accounting:view_reports'),
  ('FINANCIAL_CONTROLLER', 'hrm:view'), ('FINANCIAL_CONTROLLER', 'receipts:view'),
  ('FINANCIAL_CONTROLLER', 'receipts:submit'), ('FINANCIAL_CONTROLLER', 'receipts:approve'),
  ('FINANCIAL_CONTROLLER', 'admin:audit_logs'),
  ('HR_DIRECTOR', 'hrm:view'), ('HR_DIRECTOR', 'hrm:manage_employees'),
  ('HR_DIRECTOR', 'hrm:approve_leave'), ('HR_DIRECTOR', 'hrm:run_payroll'),
  ('HR_DIRECTOR', 'receipts:view'), ('HR_DIRECTOR', 'receipts:submit'),
  ('HR_DIRECTOR', 'admin:audit_logs'),
  ('DEPARTMENT_HEAD', 'hrm:view'), ('DEPARTMENT_HEAD', 'hrm:approve_leave'),
  ('DEPARTMENT_HEAD', 'receipts:view'), ('DEPARTMENT_HEAD', 'receipts:submit'),
  ('DEPARTMENT_HEAD', 'receipts:approve'),
  ('SENIOR_ACCOUNTANT', 'accounting:view'), ('SENIOR_ACCOUNTANT', 'accounting:post_journal'),
  ('SENIOR_ACCOUNTANT', 'accounting:approve_invoice'), ('SENIOR_ACCOUNTANT', 'accounting:view_reports'),
  ('SENIOR_ACCOUNTANT', 'receipts:view'), ('SENIOR_ACCOUNTANT', 'receipts:submit'),
  ('SENIOR_ACCOUNTANT', 'receipts:approve'),
  ('STAFF_EMPLOYEE', 'hrm:view'), ('STAFF_EMPLOYEE', 'receipts:view'),
  ('STAFF_EMPLOYEE', 'receipts:submit');

CREATE TABLE organization_memberships (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role_key text NOT NULL REFERENCES roles(key),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  session_token_hash bytea NOT NULL UNIQUE CHECK (octet_length(session_token_hash) = 32),
  csrf_token_hash bytea NOT NULL CHECK (octet_length(csrf_token_hash) = 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  rotated_from_id uuid REFERENCES user_sessions(id),
  CHECK (expires_at > created_at),
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE INDEX user_sessions_active_idx ON user_sessions (user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_on <= ends_on),
  UNIQUE (organization_id, name),
  UNIQUE (id, organization_id)
);

CREATE TABLE chart_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  normal_balance text NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
  description text NOT NULL DEFAULT '',
  parent_account_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_account_id IS NULL OR parent_account_id <> id),
  UNIQUE (organization_id, code),
  UNIQUE (id, organization_id),
  FOREIGN KEY (parent_account_id, organization_id)
    REFERENCES chart_accounts(id, organization_id)
);

CREATE TABLE journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  entry_number text NOT NULL,
  transaction_date date NOT NULL,
  memo text NOT NULL,
  source_module text NOT NULL CHECK (source_module IN (
    'GENERAL', 'ACCOUNTS_PAYABLE', 'HRM_PAYROLL', 'INVOICING', 'EXPENSE_RECEIPT'
  )),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED')),
  period_id uuid NOT NULL,
  posted_by uuid,
  reversal_of_id uuid,
  external_reference text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz,
  CHECK ((status = 'DRAFT' AND posted_at IS NULL) OR (status = 'POSTED' AND posted_at IS NOT NULL)),
  CHECK (reversal_of_id IS NULL OR reversal_of_id <> id),
  UNIQUE (organization_id, entry_number),
  UNIQUE (id, organization_id),
  UNIQUE (reversal_of_id),
  FOREIGN KEY (period_id, organization_id)
    REFERENCES accounting_periods(id, organization_id),
  FOREIGN KEY (organization_id, posted_by)
    REFERENCES organization_memberships(organization_id, user_id),
  FOREIGN KEY (reversal_of_id, organization_id)
    REFERENCES journal_entries(id, organization_id)
);

CREATE UNIQUE INDEX journal_entries_idempotency_idx
  ON journal_entries (organization_id, source_module, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX journal_entries_external_reference_idx
  ON journal_entries (organization_id, source_module, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE TABLE journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  journal_entry_id uuid NOT NULL,
  line_number integer NOT NULL CHECK (line_number > 0),
  account_id uuid NOT NULL,
  description text NOT NULL DEFAULT '',
  side text NOT NULL CHECK (side IN ('DEBIT', 'CREDIT')),
  amount numeric(20, 2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journal_entry_id, line_number),
  FOREIGN KEY (journal_entry_id, organization_id)
    REFERENCES journal_entries(id, organization_id),
  FOREIGN KEY (account_id, organization_id)
    REFERENCES chart_accounts(id, organization_id)
);

CREATE INDEX journal_entries_org_date_idx ON journal_entries (organization_id, transaction_date);
CREATE INDEX journal_lines_account_idx ON journal_lines (organization_id, account_id, journal_entry_id);

CREATE TABLE vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  tax_id text,
  contact_email text,
  phone text,
  payment_terms text NOT NULL CHECK (payment_terms IN ('NET_15', 'NET_30', 'NET_60', 'DUE_ON_RECEIPT')),
  default_expense_account_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (default_expense_account_id, organization_id)
    REFERENCES chart_accounts(id, organization_id)
);

CREATE TABLE vendor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  vendor_id uuid NOT NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  currency char(3) NOT NULL,
  subtotal numeric(20, 2) NOT NULL CHECK (subtotal >= 0),
  tax_amount numeric(20, 2) NOT NULL CHECK (tax_amount >= 0),
  total_amount numeric(20, 2) NOT NULL CHECK (total_amount > 0),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_AUDIT', 'POSTED_TO_GL', 'PAID')),
  journal_entry_id uuid,
  external_reference text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (due_date >= invoice_date),
  CHECK (subtotal + tax_amount = total_amount),
  UNIQUE (organization_id, vendor_id, invoice_number),
  UNIQUE (organization_id, id),
  FOREIGN KEY (vendor_id, organization_id) REFERENCES vendors(id, organization_id),
  FOREIGN KEY (journal_entry_id, organization_id) REFERENCES journal_entries(id, organization_id)
);

CREATE UNIQUE INDEX vendor_invoices_idempotency_idx
  ON vendor_invoices (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE vendor_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  line_number integer NOT NULL CHECK (line_number > 0),
  description text NOT NULL,
  quantity numeric(18, 4) NOT NULL CHECK (quantity > 0),
  unit_price numeric(20, 2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(20, 2) NOT NULL CHECK (line_total >= 0),
  account_id uuid NOT NULL,
  UNIQUE (invoice_id, line_number),
  FOREIGN KEY (invoice_id, organization_id) REFERENCES vendor_invoices(id, organization_id),
  FOREIGN KEY (account_id, organization_id) REFERENCES chart_accounts(id, organization_id),
  CHECK (round(quantity * unit_price, 2) = line_total)
);

CREATE TABLE vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  payment_reference text NOT NULL,
  amount numeric(20, 2) NOT NULL CHECK (amount > 0),
  paid_at timestamptz NOT NULL,
  journal_entry_id uuid,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, payment_reference),
  UNIQUE (organization_id, idempotency_key),
  UNIQUE (organization_id, invoice_id),
  FOREIGN KEY (invoice_id, organization_id) REFERENCES vendor_invoices(id, organization_id),
  FOREIGN KEY (journal_entry_id, organization_id) REFERENCES journal_entries(id, organization_id)
);

CREATE TABLE receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  claimant_user_id uuid NOT NULL,
  merchant_name text NOT NULL,
  transaction_date date NOT NULL,
  currency char(3) NOT NULL,
  amount numeric(20, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
  reviewer_user_id uuid,
  journal_entry_id uuid,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, claimant_user_id)
    REFERENCES organization_memberships(organization_id, user_id),
  FOREIGN KEY (organization_id, reviewer_user_id)
    REFERENCES organization_memberships(organization_id, user_id),
  FOREIGN KEY (journal_entry_id, organization_id) REFERENCES journal_entries(id, organization_id)
);

CREATE UNIQUE INDEX receipts_idempotency_idx
  ON receipts (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_code text NOT NULL,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  department text NOT NULL,
  job_title text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION')),
  hire_date date NOT NULL,
  sensitive_data_ciphertext bytea,
  encryption_key_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, employee_code),
  UNIQUE (organization_id, email),
  UNIQUE (id, organization_id),
  CHECK ((sensitive_data_ciphertext IS NULL) = (encryption_key_version IS NULL))
);

CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  work_date date NOT NULL,
  clocked_in_at timestamptz NOT NULL,
  clocked_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (clocked_out_at IS NULL OR clocked_out_at > clocked_in_at),
  FOREIGN KEY (employee_id, organization_id) REFERENCES employees(id, organization_id)
);

CREATE UNIQUE INDEX attendance_one_open_clockin_idx
  ON attendance_records (organization_id, employee_id, work_date)
  WHERE clocked_out_at IS NULL;

CREATE TABLE leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'MATERNITY', 'UNPAID')),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  total_days numeric(8, 2) NOT NULL CHECK (total_days > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_on <= ends_on),
  FOREIGN KEY (organization_id, reviewed_by)
    REFERENCES organization_memberships(organization_id, user_id),
  FOREIGN KEY (employee_id, organization_id) REFERENCES employees(id, organization_id)
);

CREATE TABLE payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  period_id uuid NOT NULL,
  policy_version text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CALCULATED', 'APPROVED', 'POSTED', 'PAID')),
  journal_entry_id uuid,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_id),
  UNIQUE (organization_id, id),
  FOREIGN KEY (period_id, organization_id) REFERENCES accounting_periods(id, organization_id),
  FOREIGN KEY (organization_id, created_by) REFERENCES organization_memberships(organization_id, user_id),
  FOREIGN KEY (organization_id, approved_by) REFERENCES organization_memberships(organization_id, user_id),
  FOREIGN KEY (journal_entry_id, organization_id) REFERENCES journal_entries(id, organization_id)
);

CREATE TABLE payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  payroll_run_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  base_salary numeric(20, 2) NOT NULL CHECK (base_salary >= 0),
  allowances numeric(20, 2) NOT NULL CHECK (allowances >= 0),
  gross_salary numeric(20, 2) NOT NULL CHECK (gross_salary = base_salary + allowances),
  tax_deduction numeric(20, 2) NOT NULL CHECK (tax_deduction >= 0),
  pension_deduction numeric(20, 2) NOT NULL CHECK (pension_deduction >= 0),
  net_salary numeric(20, 2) NOT NULL CHECK (net_salary = gross_salary - tax_deduction - pension_deduction),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payroll_run_id, employee_id),
  FOREIGN KEY (payroll_run_id, organization_id) REFERENCES payroll_runs(id, organization_id),
  FOREIGN KEY (employee_id, organization_id) REFERENCES employees(id, organization_id)
);

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),
  actor_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  correlation_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, actor_user_id)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE INDEX audit_logs_org_created_idx ON audit_logs (organization_id, created_at DESC);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  deduplication_key text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (organization_id, deduplication_key)
);

CREATE INDEX outbox_pending_idx ON outbox_events (available_at, created_at) WHERE status IN ('PENDING', 'FAILED');

CREATE FUNCTION enforce_posted_journal_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'POSTED' THEN
    RAISE EXCEPTION 'Posted journal entries are immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER journal_entries_immutable
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_posted_journal_immutability();

CREATE FUNCTION enforce_posted_journal_lines_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_journal_id uuid;
  target_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_journal_id := OLD.journal_entry_id;
  ELSE
    target_journal_id := NEW.journal_entry_id;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.journal_entry_id <> NEW.journal_entry_id THEN
    RAISE EXCEPTION 'Journal lines cannot be moved between entries' USING ERRCODE = '55000';
  END IF;
  SELECT status INTO target_status FROM journal_entries WHERE id = target_journal_id;
  IF target_status = 'POSTED' THEN
    RAISE EXCEPTION 'Lines of a posted journal entry are immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER journal_lines_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION enforce_posted_journal_lines_immutability();

CREATE FUNCTION validate_journal_posting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  period_is_open boolean;
  entry_date date;
  period_start date;
  period_end date;
  line_count bigint;
  debit_total numeric(30, 2);
  credit_total numeric(30, 2);
  inactive_accounts bigint;
BEGIN
  IF NEW.status <> 'POSTED' THEN
    RETURN NEW;
  END IF;

  SELECT ap.status = 'OPEN', NEW.transaction_date, ap.starts_on, ap.ends_on
    INTO period_is_open, entry_date, period_start, period_end
    FROM accounting_periods ap
   WHERE ap.id = NEW.period_id AND ap.organization_id = NEW.organization_id;
  IF NOT period_is_open OR entry_date NOT BETWEEN period_start AND period_end THEN
    RAISE EXCEPTION 'Posted journal entry must use an open accounting period'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO inactive_accounts
    FROM journal_lines jl
    JOIN chart_accounts ca ON ca.id = jl.account_id AND ca.organization_id = jl.organization_id
   WHERE jl.journal_entry_id = NEW.id AND NOT ca.is_active;
  IF inactive_accounts > 0 THEN
    RAISE EXCEPTION 'Posted journal entry cannot use inactive accounts'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*),
         coalesce(sum(amount) FILTER (WHERE side = 'DEBIT'), 0),
         coalesce(sum(amount) FILTER (WHERE side = 'CREDIT'), 0)
    INTO line_count, debit_total, credit_total
    FROM journal_lines
    WHERE journal_entry_id = NEW.id;

  IF line_count < 2 OR debit_total <= 0 OR credit_total <= 0 OR debit_total <> credit_total THEN
    RAISE EXCEPTION 'Posted journal entry must contain balanced debit and credit lines'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER journal_entry_validate_posting
  BEFORE INSERT OR UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION validate_journal_posting();

CREATE FUNCTION audit_logs_are_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit log rows are append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER audit_logs_no_mutation
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_are_append_only();