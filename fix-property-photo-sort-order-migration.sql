-- Run this in the Supabase SQL Editor.
-- Cleans up duplicate property_photos.sort_order values left over from
-- the old count-based numbering (which could reissue a sort_order that a
-- surviving photo already had, after a delete-then-add). Renumbers every
-- Journey's photos sequentially in their current order, with each row's
-- id as a tiebreaker for any photos that currently share a sort_order.

with ranked as (
  select id, row_number() over (
    partition by journey_id
    order by sort_order asc nulls last, id asc
  ) as rn
  from property_photos
)
update property_photos set sort_order = ranked.rn
from ranked
where property_photos.id = ranked.id;
