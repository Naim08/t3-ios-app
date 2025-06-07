-- Add Trip Planner tool to the tools table
INSERT INTO public.tools (id, name, description, json_schema, endpoint, cost_tokens, requires_premium) VALUES
(
    'tripplanner',
    'tripplanner',
    'Comprehensive trip planner that helps plan complete travel itineraries including destination search, flights, weather, accommodations, and detailed day-by-day schedules',
    '{
        "type": "object",
        "properties": {
            "destinations": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Array of destination names (e.g., [\"Paris\", \"London\", \"Rome\"])",
                "minItems": 1,
                "maxItems": 5
            },
            "start_date": {
                "type": "string",
                "format": "date",
                "description": "Trip start date in YYYY-MM-DD format"
            },
            "end_date": {
                "type": "string",
                "format": "date",
                "description": "Trip end date in YYYY-MM-DD format"
            },
            "departure_location": {
                "type": "string",
                "description": "Origin city for flights (optional)"
            },
            "budget": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "Total budget amount"
                    },
                    "currency": {
                        "type": "string",
                        "default": "USD",
                        "description": "Currency code (e.g., USD, EUR, GBP)"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["budget", "mid-range", "luxury"],
                        "default": "mid-range",
                        "description": "Budget category"
                    }
                }
            },
            "travelers": {
                "type": "object",
                "properties": {
                    "adults": {
                        "type": "integer",
                        "minimum": 1,
                        "default": 2,
                        "description": "Number of adult travelers"
                    },
                    "children": {
                        "type": "integer",
                        "minimum": 0,
                        "description": "Number of children"
                    }
                },
                "required": ["adults"]
            },
            "preferences": {
                "type": "object",
                "properties": {
                    "accommodation_type": {
                        "type": "string",
                        "enum": ["hotel", "hostel", "apartment", "resort", "any"],
                        "description": "Preferred accommodation type"
                    },
                    "activity_types": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["cultural", "adventure", "relaxation", "sightseeing", "dining", "shopping", "entertainment"]
                        },
                        "description": "Preferred activity types"
                    },
                    "dietary_restrictions": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "Dietary restrictions or preferences"
                    },
                    "interests": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "Interests (e.g., history, art, nature, nightlife)"
                    }
                }
            },
            "trip_type": {
                "type": "string",
                "enum": ["leisure", "business", "adventure", "cultural", "romantic", "family"],
                "default": "leisure",
                "description": "Type of trip"
            },
            "include_flights": {
                "type": "boolean",
                "default": true,
                "description": "Include flight options in the plan"
            },
            "include_weather": {
                "type": "boolean",
                "default": true,
                "description": "Include weather forecast"
            },
            "include_accommodations": {
                "type": "boolean",
                "default": true,
                "description": "Include accommodation suggestions"
            },
            "include_activities": {
                "type": "boolean",
                "default": true,
                "description": "Include activity recommendations"
            },
            "include_detailed_itinerary": {
                "type": "boolean",
                "default": true,
                "description": "Include day-by-day detailed itinerary"
            }
        },
        "required": ["destinations", "start_date", "end_date", "travelers"]
    }'::jsonb,
    'tripplanner',
    150,
    true -- Premium only due to comprehensive nature
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    json_schema = EXCLUDED.json_schema,
    endpoint = EXCLUDED.endpoint,
    cost_tokens = EXCLUDED.cost_tokens,
    requires_premium = EXCLUDED.requires_premium,
    updated_at = now();

-- Update specific personas to include the trip planner tool
UPDATE public.personas 
SET tool_ids = array_append(COALESCE(tool_ids, '{}'), 'tripplanner')
WHERE id IN ('wanderlust-maya', 'productivity-coach')
AND NOT ('tripplanner' = ANY(COALESCE(tool_ids, '{}')));

-- Create a dedicated travel planning persona if it doesn't exist
INSERT INTO public.personas (id, display_name, icon, system_prompt, default_model, requires_premium, category_id, description, tags, is_featured, tool_ids) VALUES
(
    'travel-guru',
    'Maya TravelGuru',
    '🌍',
    'You are Maya, an experienced travel consultant and trip planning expert who has helped thousands of travelers create unforgettable journeys around the world.

Your Expertise:
- Comprehensive trip planning for all types of travel
- Destination research and recommendations
- Budget optimization and cost-saving strategies
- Cultural insights and local experiences
- Travel logistics and safety considerations
- Accommodation and activity recommendations

Your Approach:
- Ask detailed questions to understand traveler preferences
- Consider budget, time constraints, and travel style
- Provide insider tips and local knowledge
- Balance must-see attractions with authentic experiences
- Offer alternatives for different weather or circumstances
- Emphasize safety and cultural sensitivity

Tools Available:
- Trip Planner: Generate comprehensive travel itineraries
- Weather forecasting for destination planning
- Flight and accommodation research
- Local activity and attraction recommendations

Communication Style: Enthusiastic and knowledgeable. You share your passion for travel while providing practical, well-researched advice. You ask thoughtful questions to create personalized travel experiences.',
    'gpt-4o',
    true,
    'lifestyle',
    'Expert travel planning and destination guidance',
    '{"travel", "planning", "destinations", "culture", "adventure"}',
    true,
    ARRAY['tripplanner', 'weather', 'wiki']
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    icon = EXCLUDED.icon,
    system_prompt = EXCLUDED.system_prompt,
    default_model = EXCLUDED.default_model,
    requires_premium = EXCLUDED.requires_premium,
    category_id = EXCLUDED.category_id,
    description = EXCLUDED.description,
    tags = EXCLUDED.tags,
    is_featured = EXCLUDED.is_featured,
    tool_ids = EXCLUDED.tool_ids;
