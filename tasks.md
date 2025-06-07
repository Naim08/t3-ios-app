{
  "requests": [
    {
      "requestId": "req-1",
      "originalRequest": "Implement 6 new AI tools for pocket-t3 app: nutrition (USDA FoodData), convert (exchangerate.host + unit math), flights (Skyscanner Rapid API - premium only), summarise (Readability + gpt-3.5), md2slides (Pandoc Cloud Run - premium only), and moodmusic (Spotify recommendations). Include database seeds with 100x higher token costs, edge functions, migrations, tests, and persona integration.",
      "splitDetails": "Implement 6 new AI tools for pocket-t3 app: nutrition (USDA FoodData), convert (exchangerate.host + unit math), flights (Skyscanner Rapid API - premium only), summarise (Readability + gpt-3.5), md2slides (Pandoc Cloud Run - premium only), and moodmusic (Spotify recommendations). Include database seeds with 100x higher token costs, edge functions, migrations, tests, and persona integration.",
      "tasks": [
        {
          "id": "task-8",
          "title": "Phase 1: Research & Documentation with Context7",
          "description": "Use Context7 to gather the most up-to-date documentation for all external APIs and services before implementation to ensure we're using latest endpoints, authentication methods, and best practices.",
          "done": true,
          "approved": false,
          "completedDetails": "Successfully completed Phase 1 research and documentation for all 6 AI tools and Supabase Edge Functions:\n\n**API Research Completed:**\n1. **USDA FoodData Central API**: Base URL, API key requirements, rate limits (1000/hour), endpoints (/food/{fdcId}, /foods/search, /foods/list)\n2. **exchangerate.host API**: Access key requirements, live rates, historical data, currency conversion, 168 currencies supported\n3. **Skyscanner Rapid API**: Session-based API with /create and /poll endpoints, flight search functionality  \n4. **Mozilla Readability API**: NPM package @mozilla/readability for content extraction, containerized service available\n5. **Pandoc Cloud Run**: Markdown-to-slides conversion, Google Cloud Run deployment ready\n6. **Spotify Web API**: TypeScript SDK, user authorization, recommendations, client credentials flow\n\n**Supabase Edge Functions Best Practices:**\n- Use Web APIs and Deno core APIs over external dependencies\n- Import external dependencies with npm: or jsr: prefixes and versions\n- Shared utilities in supabase/functions/_shared folder\n- Built-in Deno.serve instead of external server imports\n- Pre-populated environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, etc.)\n- CORS handling for browser requests\n- \"Fat functions\" approach with multiple routes per function\n- Hyphen-based function naming for URL-friendliness\n\nAll documentation is ready for Phase 2 implementation.",
          "subtasks": [
            {
              "id": "subtask-2",
              "title": "Research USDA FoodData Central API",
              "description": "Get latest API endpoints, data structures, search parameters, and nutrition data formats",
              "done": true
            },
            {
              "id": "subtask-3",
              "title": "Research exchangerate.host API",
              "description": "Current rate limits, response formats, supported currencies, and error handling",
              "done": true
            },
            {
              "id": "subtask-4",
              "title": "Research Skyscanner Rapid API",
              "description": "Flight search endpoints, authentication, request/response formats, and pricing",
              "done": true
            },
            {
              "id": "subtask-5",
              "title": "Research Readability API",
              "description": "Text extraction capabilities, supported formats, and content parsing methods",
              "done": true
            },
            {
              "id": "subtask-6",
              "title": "Research Pandoc Cloud Run setup",
              "description": "Document conversion service setup, supported formats, and deployment options",
              "done": true
            },
            {
              "id": "subtask-7",
              "title": "Research Spotify Web API",
              "description": "Music recommendation algorithms, authentication flow, and playlist generation",
              "done": true
            },
            {
              "id": "subtask-8",
              "title": "Research Supabase Edge Functions best practices",
              "description": "Current patterns, error handling, CORS setup, and deployment strategies",
              "done": true
            }
          ]
        },
        {
          "id": "task-12",
          "title": "Phase 2: Database Setup",
          "description": "Create database seeds and migrations for the new tools with proper token costs and indexing.",
          "done": false,
          "approved": false,
          "completedDetails": "",
          "subtasks": [
            {
              "id": "subtask-10",
              "title": "Create tools seed file",
              "description": "Create supabase/seeds/20250620_new_tools.sql with 6 new tools and 100x higher costs: nutrition(1000), convert(500), flights(5000), summarise(1500), md2slides(2500), moodmusic(1000)",
              "done": false
            },
            {
              "id": "subtask-11",
              "title": "Create tool cost index migration",
              "description": "Create supabase/migrations/20250620_add_tool_cost_index.sql for performance optimization",
              "done": false
            },
            {
              "id": "subtask-12",
              "title": "Update personas with tool IDs",
              "description": "Create src/personas/persona_ids.sql to add new tool_ids to appropriate personas",
              "done": false
            }
          ]
        },
        {
          "id": "task-19",
          "title": "Phase 3: Edge Functions Implementation",
          "description": "Implement all 6 edge functions following existing patterns and using researched API documentation.",
          "done": false,
          "approved": false,
          "completedDetails": "",
          "subtasks": [
            {
              "id": "subtask-14",
              "title": "Implement nutrition.ts",
              "description": "Create supabase/functions/tools/nutrition.ts using USDA FoodData Central API for food nutrition lookup",
              "done": false
            },
            {
              "id": "subtask-15",
              "title": "Implement convert.ts",
              "description": "Create supabase/functions/tools/convert.ts using exchangerate.host + in-model unit math for currency and unit conversions",
              "done": false
            },
            {
              "id": "subtask-16",
              "title": "Implement flights.ts",
              "description": "Create supabase/functions/tools/flights.ts using Skyscanner Rapid API for flight search (premium-only with proper auth checks)",
              "done": false
            },
            {
              "id": "subtask-17",
              "title": "Implement summarise.ts",
              "description": "Create supabase/functions/tools/summarise.ts using Readability API + gpt-3.5 for content summarization",
              "done": false
            },
            {
              "id": "subtask-18",
              "title": "Implement md2slides.ts",
              "description": "Create supabase/functions/tools/md2slides.ts using Pandoc Cloud Run job for markdown to slides conversion (premium-only)",
              "done": false
            },
            {
              "id": "subtask-19",
              "title": "Implement moodmusic.ts",
              "description": "Create supabase/functions/tools/moodmusic.ts using Spotify Web API for mood-based music recommendations",
              "done": false
            }
          ]
        },
        {
          "id": "task-24",
          "title": "Phase 4: Testing & Integration",
          "description": "Create comprehensive tests and ensure proper integration with existing tool gateway system.",
          "done": false,
          "approved": false,
          "completedDetails": "",
          "subtasks": [
            {
              "id": "subtask-21",
              "title": "Create tools execution tests",
              "description": "Create supabase/tests/tools_execution.test.ts with comprehensive test coverage for all 6 new tools",
              "done": false
            },
            {
              "id": "subtask-22",
              "title": "Test premium-only restrictions",
              "description": "Verify flights.ts and md2slides.ts properly enforce premium subscription requirements",
              "done": false
            },
            {
              "id": "subtask-23",
              "title": "Test tool gateway auto-routing",
              "description": "Ensure new tools are properly routed by tool_id alongside existing wiki.ts and weather.ts",
              "done": false
            },
            {
              "id": "subtask-24",
              "title": "Integration testing",
              "description": "Test end-to-end functionality from React Native app through edge functions to external APIs",
              "done": false
            }
          ]
        }
      ],
      "completed": false,
      "notes": []
    }
  ]
}