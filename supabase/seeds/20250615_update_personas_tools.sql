-- Update personas with tool capabilities
UPDATE public.personas SET tool_ids = ARRAY['weather', 'wiki']::text[]
WHERE id = 'travel-planner';

UPDATE public.personas SET tool_ids = ARRAY['wiki']::text[]
WHERE id IN ('code-sensei', 'science-teacher', 'history-professor', 'language-tutor');

UPDATE public.personas SET tool_ids = ARRAY['wiki', 'code_search']::text[]
WHERE id IN ('tech-support', 'data-scientist');

-- Update persona system prompts to mention tool usage
UPDATE public.personas 
SET system_prompt = system_prompt || E'\n\nYou have access to tools that can help provide accurate, up-to-date information. Use the weather tool to get current weather conditions and forecasts. Use the Wikipedia search tool to find factual information about places, attractions, and travel-related topics.'
WHERE id = 'travel-planner';

UPDATE public.personas 
SET system_prompt = system_prompt || E'\n\nYou have access to Wikipedia search to help provide accurate information about programming concepts, frameworks, and technologies.'
WHERE id = 'code-sensei';

UPDATE public.personas 
SET system_prompt = system_prompt || E'\n\nYou have access to Wikipedia search to help provide accurate scientific information and facts.'
WHERE id = 'science-teacher';

UPDATE public.personas 
SET system_prompt = system_prompt || E'\n\nYou have access to Wikipedia search to help provide accurate historical information and context.'
WHERE id = 'history-professor';