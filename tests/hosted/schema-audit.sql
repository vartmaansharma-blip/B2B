-- Read-only. Run with the connected Supabase execute_sql tool on the allowlisted
-- project. Save only the audit object to the private directory as schema-audit.json.
-- Never replay/repair migrations to make these provider versions match filenames.
select jsonb_build_object(
  'project', 'ywciamahpwefiuihlynw',
  'observed_at', current_timestamp,
  'database_date', current_date,
  'timezone', current_setting('TimeZone'),
  'migrations', (select jsonb_agg(jsonb_build_object('version',version,'name',name) order by version) from supabase_migrations.schema_migrations),
  'functions', (select jsonb_object_agg(p.proname, md5(regexp_replace(p.prosrc,'\s','','g'))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private'),
  'rls_tables', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity),
  'caller_scoped_view', (select 'security_invoker=true'=any(c.reloptions) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='rfq_shortlist_status'),
  'anonymous_grants', (select count(*) from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','PUBLIC')),
  'catalog_md5', (select md5(string_agg(definition,E'\n' order by definition)) from (
    select pg_get_viewdef(c.oid) as definition from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v'
    union all select pg_get_constraintdef(c.oid) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public'
    union all select row(tablename,policyname,roles,cmd,qual,with_check)::text from pg_policies where schemaname='public'
    union all select row(table_name,grantee,privilege_type)::text from information_schema.role_table_grants where table_schema='public'
    union all select pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal
  ) definitions)
) as audit;
