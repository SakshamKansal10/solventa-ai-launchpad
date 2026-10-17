-- Solventia opportunity images (AI-generated contextual photos)
-- Run after 0013. Safe to re-run.
-- One generated image per opportunity, stored in a public-read bucket (random
-- object names, owner-only write inside the caller's own auth.uid() folder) and
-- referenced by this table so it is generated once and reused.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('opportunity-images', 'opportunity-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "opp_images_public_read" on storage.objects;
create policy "opp_images_public_read" on storage.objects
  for select using (bucket_id = 'opportunity-images');

drop policy if exists "opp_images_insert_own" on storage.objects;
create policy "opp_images_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'opportunity-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "opp_images_update_own" on storage.objects;
create policy "opp_images_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'opportunity-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'opportunity-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "opp_images_delete_own" on storage.objects;
create policy "opp_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'opportunity-images' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.opportunity_images (
  opportunity_id uuid primary key references public.opportunities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  image_path text not null,
  prompt_hash text not null,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunity_images enable row level security;

drop policy if exists "opportunity_images_all_own" on public.opportunity_images;
create policy "opportunity_images_all_own" on public.opportunity_images
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The referenced opportunity must belong to the caller (same rule as 0013).
drop policy if exists "opportunity_images_refs_owned" on public.opportunity_images;
create policy "opportunity_images_refs_owned" on public.opportunity_images
  as restrictive for all
  using (true)
  with check (
    exists (
      select 1 from public.opportunities o
       where o.id = opportunity_images.opportunity_id and o.user_id = auth.uid()
    )
  );
