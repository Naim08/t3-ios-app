-- Create conversations table
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  persona_id text references personas(id) on delete set null,
  title text not null,
  last_message_preview text,
  message_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create messages table
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model_used text,
  token_usage jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table conversations enable row level security;
alter table messages enable row level security;

-- Conversations policies
create policy "Users can view their own conversations" on conversations
  for select using (auth.uid() = user_id);

create policy "Users can insert their own conversations" on conversations
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own conversations" on conversations
  for update using (auth.uid() = user_id);

create policy "Users can delete their own conversations" on conversations
  for delete using (auth.uid() = user_id);

-- Messages policies
create policy "Users can view messages from their conversations" on messages
  for select using (
    exists (
      select 1 from conversations 
      where id = messages.conversation_id 
      and user_id = auth.uid()
    )
  );

create policy "Users can insert messages to their conversations" on messages
  for insert with check (
    exists (
      select 1 from conversations 
      where id = messages.conversation_id 
      and user_id = auth.uid()
    )
  );

create policy "Users can update messages in their conversations" on messages
  for update using (
    exists (
      select 1 from conversations 
      where id = messages.conversation_id 
      and user_id = auth.uid()
    )
  );

create policy "Users can delete messages from their conversations" on messages
  for delete using (
    exists (
      select 1 from conversations 
      where id = messages.conversation_id 
      and user_id = auth.uid()
    )
  );

-- Create indexes for performance
create index conversations_user_id_updated_at_idx on conversations(user_id, updated_at desc);
create index conversations_persona_id_idx on conversations(persona_id);
create index messages_conversation_id_created_at_idx on messages(conversation_id, created_at);

-- Function to update conversation updated_at timestamp
create or replace function update_conversation_updated_at()
returns trigger as $$
begin
  update conversations 
  set updated_at = now(),
      message_count = (
        select count(*) from messages 
        where conversation_id = NEW.conversation_id
      ),
      last_message_preview = case 
        when NEW.role = 'user' then left(NEW.content, 100)
        else (
          select left(content, 100) 
          from messages 
          where conversation_id = NEW.conversation_id 
          and role = 'user' 
          order by created_at desc 
          limit 1
        )
      end
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to update conversation when messages change
create trigger update_conversation_on_message_change
  after insert or update on messages
  for each row
  execute function update_conversation_updated_at();