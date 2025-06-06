-- Seed initial tools
INSERT INTO public.tools (id, name, description, json_schema, endpoint, cost_tokens, requires_premium) VALUES
(
    'weather',
    'weather',
    'Get current weather and forecast for a specific location',
    '{
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "The city and state/country, e.g. San Francisco, CA or Tokyo, Japan"
            },
            "units": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "description": "Temperature units",
                "default": "celsius"
            }
        },
        "required": ["location"]
    }'::jsonb,
    'weather',
    20,
    false
),
(
    'wiki',
    'wiki',
    'Search Wikipedia for information on any topic',
    '{
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of results to return",
                "default": 3,
                "minimum": 1,
                "maximum": 10
            }
        },
        "required": ["query"]
    }'::jsonb,
    'wiki',
    30,
    false
),
(
    'code_search',
    'code_search',
    'Search programming language documentation and code examples',
    '{
        "type": "object",
        "properties": {
            "language": {
                "type": "string",
                "description": "Programming language (e.g., python, javascript, rust)"
            },
            "query": {
                "type": "string",
                "description": "What to search for"
            }
        },
        "required": ["language", "query"]
    }'::jsonb,
    'code_search',
    50,
    true -- Premium only
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    json_schema = EXCLUDED.json_schema,
    endpoint = EXCLUDED.endpoint,
    cost_tokens = EXCLUDED.cost_tokens,
    requires_premium = EXCLUDED.requires_premium,
    updated_at = now();