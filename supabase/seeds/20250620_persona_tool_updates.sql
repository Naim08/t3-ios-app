-- Update personas with new tool IDs based on their specialties

-- Travel Planner gets flights and convert tools
UPDATE public.personas 
SET tool_ids = array_append(array_append(tool_ids, 'flights'), 'convert')
WHERE id = 'travel-planner' 
  AND NOT ('flights' = ANY(tool_ids) AND 'convert' = ANY(tool_ids));

-- Update Travel Planner system prompt to mention new tools
UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou also have access to flight search to find real flight options and prices between destinations, and a currency converter for travel budget planning.'
WHERE id = 'travel-planner';

-- Code Sensei gets summarise and md2slides tools
UPDATE public.personas 
SET tool_ids = array_append(array_append(tool_ids, 'summarise'), 'md2slides')
WHERE id = 'code-sensei'
  AND NOT ('summarise' = ANY(tool_ids) AND 'md2slides' = ANY(tool_ids));

UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou can summarize technical documentation and articles, and convert markdown documentation to presentation slides for technical talks.'
WHERE id = 'code-sensei';

-- Dr. Mindwell gets moodmusic tool for therapeutic music recommendations
UPDATE public.personas 
SET tool_ids = array_append(tool_ids, 'moodmusic')
WHERE id = 'dr-mindwell'
  AND NOT ('moodmusic' = ANY(tool_ids));

UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou can recommend music based on mood and emotional states to support therapeutic goals and emotional regulation.'
WHERE id = 'dr-mindwell';

-- Fitness Trainer gets nutrition tool
UPDATE public.personas 
SET tool_ids = array_append(tool_ids, 'nutrition')
WHERE id = 'fitness-trainer'
  AND NOT ('nutrition' = ANY(tool_ids));

UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou have access to detailed nutrition information from the USDA database to help with meal planning and dietary guidance.'
WHERE id = 'fitness-trainer';

-- Nutrition Coach gets nutrition tool
UPDATE public.personas 
SET tool_ids = array_append(tool_ids, 'nutrition')
WHERE id = 'nutrition-coach'
  AND NOT ('nutrition' = ANY(tool_ids));

UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou can look up detailed nutritional information for any food using the USDA FoodData Central database.'
WHERE id = 'nutrition-coach';

-- Financial Advisor gets convert tool for currency conversions
UPDATE public.personas 
SET tool_ids = array_append(tool_ids, 'convert')
WHERE id = 'financial-advisor'
  AND NOT ('convert' = ANY(tool_ids));

UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou can perform currency conversions using live exchange rates for international investment and travel budget planning.'
WHERE id = 'financial-advisor';

-- Writing Mentor gets summarise and md2slides tools
UPDATE public.personas 
SET tool_ids = array_append(array_append(tool_ids, 'summarise'), 'md2slides')
WHERE id = 'writing-mentor'
  AND NOT ('summarise' = ANY(tool_ids) AND 'md2slides' = ANY(tool_ids));

UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou can summarize articles and content for research, and convert written content to presentation slides.'
WHERE id = 'writing-mentor';

-- Science Teacher gets convert tool for unit conversions
UPDATE public.personas 
SET tool_ids = array_append(tool_ids, 'convert')
WHERE id = 'science-teacher'
  AND NOT ('convert' = ANY(tool_ids));

UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou can perform unit conversions for scientific calculations and demonstrations.'
WHERE id = 'science-teacher';

-- Mindfulness Guide gets moodmusic tool
UPDATE public.personas 
SET tool_ids = array_append(tool_ids, 'moodmusic')
WHERE id = 'mindfulness-guide'
  AND NOT ('moodmusic' = ANY(tool_ids));

UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou can recommend calming music and soundscapes to enhance meditation and mindfulness practices.'
WHERE id = 'mindfulness-guide';

-- Tech Support gets summarise tool for documentation
UPDATE public.personas 
SET tool_ids = array_append(tool_ids, 'summarise')
WHERE id = 'tech-support'
  AND NOT ('summarise' = ANY(tool_ids));

UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou can summarize technical documentation and support articles to quickly find solutions.'
WHERE id = 'tech-support';

-- Data Scientist gets convert and md2slides tools
UPDATE public.personas 
SET tool_ids = array_append(array_append(tool_ids, 'convert'), 'md2slides')
WHERE id = 'data-scientist'
  AND NOT ('convert' = ANY(tool_ids) AND 'md2slides' = ANY(tool_ids));

UPDATE public.personas
SET system_prompt = system_prompt || E'\n\nYou can perform unit conversions for data analysis and create presentation slides from markdown reports.'
WHERE id = 'data-scientist';