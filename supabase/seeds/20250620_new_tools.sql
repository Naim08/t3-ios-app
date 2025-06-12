-- Seeds for 6 new AI tools with 100x higher token costs

-- Insert new AI tools
INSERT INTO public.tools (id, name, description, json_schema, endpoint, cost_tokens, requires_premium) VALUES

-- 1. Nutrition Tool (USDA FoodData Central)
('nutrition', 'nutrition', 'Get detailed nutrition information for any food item using USDA FoodData Central database', 
'{
  "type": "object",
  "properties": {
    "food_query": {
      "type": "string",
      "description": "The food item to search for (e.g., \"apple\", \"chicken breast\", \"brown rice\")"
    },
    "serving_size": {
      "type": "string",
      "description": "Optional serving size (e.g., \"100g\", \"1 cup\", \"1 medium\")",
      "default": "100g"
    }
  },
  "required": ["food_query"]
}', 
'nutrition', 
1000, 
false),

-- 2. Convert Tool (Currency & Unit Conversion)
('convert', 'convert', 'Convert between currencies using live exchange rates or between various units of measurement',
'{
  "type": "object",
  "properties": {
    "amount": {
      "type": "number",
      "description": "The amount to convert"
    },
    "from": {
      "type": "string",
      "description": "The source currency code (e.g., \"USD\", \"EUR\") or unit (e.g., \"kg\", \"miles\")"
    },
    "to": {
      "type": "string",
      "description": "The target currency code or unit"
    },
    "type": {
      "type": "string",
      "enum": ["currency", "unit"],
      "description": "Whether this is a currency or unit conversion",
      "default": "currency"
    }
  },
  "required": ["amount", "from", "to"]
}',
'convert',
500,
false),

-- 3. Flights Tool (Flight Search)
('flights', 'flights', 'Flight search tool for finding flights between destinations. Use for "flights from X to Y" queries. Does NOT handle booking.',
'{
  "type": "object",
  "properties": {
    "origin": {
      "type": "string",
      "description": "Origin city or airport (e.g., \"NYC\", \"New York\", \"JFK\")"
    },
    "destination": {
      "type": "string",
      "description": "Destination city or airport (e.g., \"London\", \"LHR\")"
    },
    "departure_date": {
      "type": "string",
      "format": "date",
      "description": "Departure date in YYYY-MM-DD format"
    },
    "return_date": {
      "type": "string",
      "format": "date",
      "description": "Optional return date for round trip in YYYY-MM-DD format"
    },
    "passengers": {
      "type": "integer",
      "description": "Number of passengers",
      "default": 1,
      "minimum": 1,
      "maximum": 9
    },
    "class": {
      "type": "string",
      "enum": ["economy", "business", "first"],
      "description": "Travel class",
      "default": "economy"
    }
  },
  "required": ["origin", "destination", "departure_date"]
}',
'flights',
5000,
false),

-- 4. Summarise Tool (Readability + GPT-3.5)
('summarise', 'summarise', 'Extract and summarize content from any webpage using Mozilla Readability and GPT-3.5',
'{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "The URL of the webpage to summarize"
    },
    "summary_length": {
      "type": "string",
      "enum": ["brief", "medium", "detailed"],
      "description": "Desired length of the summary",
      "default": "medium"
    },
    "focus_topics": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Optional topics to focus on in the summary"
    }
  },
  "required": ["url"]
}',
'summarise',
1500,
false),

-- 5. MD2Slides Tool (Pandoc Cloud Run - Premium Only)
('md2slides', 'md2slides', 'Convert markdown content to presentation slides using Pandoc Cloud Run service (Premium feature)',
'{
  "type": "object",
  "properties": {
    "markdown_content": {
      "type": "string",
      "description": "The markdown content to convert to slides"
    },
    "output_format": {
      "type": "string",
      "enum": ["reveal", "beamer", "pptx", "html5"],
      "description": "Desired presentation format",
      "default": "reveal"
    },
    "theme": {
      "type": "string",
      "description": "Presentation theme (format-specific)",
      "default": "default"
    },
    "slide_level": {
      "type": "integer",
      "description": "Heading level to use for slide breaks",
      "default": 2,
      "minimum": 1,
      "maximum": 3
    }
  },
  "required": ["markdown_content"]
}',
'md2slides',
2500,
true),

-- 6. MoodMusic Tool (Spotify Recommendations)
('moodmusic', 'moodmusic', 'Get personalized music recommendations based on mood, activity, or musical preferences using Spotify API',
'{
  "type": "object",
  "properties": {
    "mood": {
      "type": "string",
      "description": "Current mood or desired mood (e.g., \"happy\", \"relaxed\", \"energetic\", \"focused\")"
    },
    "activity": {
      "type": "string",
      "description": "Optional activity context (e.g., \"workout\", \"studying\", \"party\", \"sleep\")"
    },
    "genres": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Preferred music genres (optional)",
      "maxItems": 5
    },
    "energy_level": {
      "type": "number",
      "description": "Desired energy level (0.0 to 1.0)",
      "minimum": 0,
      "maximum": 1
    },
    "limit": {
      "type": "integer",
      "description": "Number of recommendations to return",
      "default": 10,
      "minimum": 1,
      "maximum": 50
    }
  },
  "required": ["mood"]
}',
'moodmusic',
1000,
false)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    json_schema = EXCLUDED.json_schema,
    endpoint = EXCLUDED.endpoint,
    cost_tokens = EXCLUDED.cost_tokens,
    requires_premium = EXCLUDED.requires_premium,
    updated_at = now();

-- Update the tools with consistent formatting and add created_at if not exists
UPDATE public.tools 
SET updated_at = now()
WHERE id IN ('nutrition', 'convert', 'flights', 'summarise', 'md2slides', 'moodmusic');