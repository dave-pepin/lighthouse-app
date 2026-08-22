-- Run this in the Supabase SQL Editor to create one sample Journey
-- to test the app with, once you're logged in. It looks up your
-- agent/agency automatically via your email — just change the
-- email below to yours.

with me as (
  select id as agent_id, agency_id from users where email = 'dave@davepepin.com'
),
new_journey as (
  insert into journeys (
    agency_id, agent_id, client_name, role, stage, stage_index,
    needs_guidance, guidance_note, next_action,
    update_preference, client_email, client_phone
  )
  select
    agency_id, agent_id, 'Priya & Sam Waller', 'Buying', 'Inspection', 3,
    true, 'Inspection report flagged a roof issue — client is anxious, call today.',
    'Call to discuss inspection results',
    'both', 'priya.waller@example.com', '555-0100'
  from me
  returning id
)
insert into milestones (journey_id, label, done, sort_order)
select id, label, done, sort_order from new_journey, (
  values
    ('Pre-approval received', true, 1),
    ('Offer accepted', true, 2),
    ('Inspection scheduled', true, 3),
    ('Inspection report reviewed', false, 4),
    ('Repair negotiation', false, 5)
) as m(label, done, sort_order);

insert into weekly_updates (journey_id, draft_text, status)
select id, 'This week: your inspection is complete. We''re reviewing the findings together and will discuss next steps on our call.', 'draft'
from (select id from journeys order by created_at desc limit 1) as j;
