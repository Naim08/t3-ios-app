// MoodMusic tool using Spotify Web API

export interface MoodMusicRequest {
  mood: string
  activity?: string
  genres?: string[]
  energy_level?: number
  limit?: number
}

export interface TrackRecommendation {
  name: string
  artist: string
  album: string
  duration: number
  preview_url?: string
  spotify_url: string
  popularity: number
  energy: number
  valence: number
}

export interface MoodMusicResponse {
  mood: string
  activity?: string
  tracks: TrackRecommendation[]
  total_tracks: number
  playlist_url?: string
}

export async function getMoodMusic(
  requestData: MoodMusicRequest
): Promise<{ success: boolean; data: MoodMusicResponse; message: string }> {
  const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID')
  const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET')
  
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return {
      success: false,
      data: {} as MoodMusicResponse,
      message: 'Spotify API credentials not configured'
    }
  }

  try {
    const {
      mood,
      activity,
      genres = [],
      energy_level,
      limit = 10
    } = requestData

    // Step 1: Get Spotify access token
    const accessToken = await getSpotifyAccessToken(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)
    
    if (!accessToken) {
      throw new Error('Failed to obtain Spotify access token')
    }

    // Step 2: Map mood and activity to Spotify audio features
    const audioFeatures = mapMoodToAudioFeatures(mood, activity, energy_level)
    
    // Step 3: Get recommendations from Spotify
    const recommendations = await getSpotifyRecommendations(
      accessToken,
      audioFeatures,
      genres,
      limit
    )

    if (!recommendations || recommendations.length === 0) {
      return {
        success: false,
        data: {} as MoodMusicResponse,
        message: `No music recommendations found for mood: ${mood}`
      }
    }

    // Step 4: Format the response
    const tracks: TrackRecommendation[] = recommendations.map((track: any) => ({
      name: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      album: track.album?.name || 'Unknown Album',
      duration: track.duration_ms,
      preview_url: track.preview_url,
      spotify_url: track.external_urls?.spotify || '',
      popularity: track.popularity || 0,
      energy: track.audio_features?.energy || 0.5,
      valence: track.audio_features?.valence || 0.5
    }))

    const moodMusicResponse: MoodMusicResponse = {
      mood: mood,
      activity: activity,
      tracks: tracks,
      total_tracks: tracks.length,
      playlist_url: `https://open.spotify.com/search/${encodeURIComponent(mood + ' ' + (activity || ''))}`
    }

    return {
      success: true,
      data: moodMusicResponse,
      message: `Found ${tracks.length} music recommendations for ${mood}${activity ? ` during ${activity}` : ''}`
    }

  } catch (error) {
    console.error('MoodMusic error:', error)
    return {
      success: false,
      data: {} as MoodMusicResponse,
      message: `Failed to get music recommendations: ${(error as Error).message}`
    }
  }
}

async function getSpotifyAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      throw new Error(`Spotify auth error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.access_token

  } catch (error) {
    console.error('Spotify authentication error:', error)
    return null
  }
}

function mapMoodToAudioFeatures(mood: string, activity?: string, energyLevel?: number): any {
  const moodLower = mood.toLowerCase()
  const activityLower = activity?.toLowerCase() || ''
  
  // Define base audio features for different moods
  const moodFeatures: Record<string, any> = {
    happy: { valence: 0.8, energy: 0.7, danceability: 0.7 },
    sad: { valence: 0.2, energy: 0.3, danceability: 0.3 },
    energetic: { valence: 0.7, energy: 0.9, danceability: 0.8 },
    calm: { valence: 0.5, energy: 0.2, danceability: 0.3 },
    relaxed: { valence: 0.6, energy: 0.2, danceability: 0.2 },
    focused: { valence: 0.4, energy: 0.4, danceability: 0.2, instrumentalness: 0.7 },
    excited: { valence: 0.9, energy: 0.9, danceability: 0.9 },
    melancholy: { valence: 0.2, energy: 0.3, danceability: 0.2 },
    romantic: { valence: 0.7, energy: 0.4, danceability: 0.5 },
    angry: { valence: 0.2, energy: 0.8, danceability: 0.4 },
    nostalgic: { valence: 0.4, energy: 0.3, danceability: 0.3 },
    uplifting: { valence: 0.9, energy: 0.8, danceability: 0.7 },
    dreamy: { valence: 0.6, energy: 0.3, danceability: 0.3 },
    motivational: { valence: 0.8, energy: 0.9, danceability: 0.7 }
  }

  // Activity-based adjustments
  const activityFeatures: Record<string, any> = {
    workout: { energy: 0.9, danceability: 0.8, tempo: 140 },
    study: { energy: 0.3, instrumentalness: 0.8, valence: 0.5 },
    party: { energy: 0.9, danceability: 0.9, valence: 0.8 },
    sleep: { energy: 0.1, valence: 0.4, tempo: 60 },
    meditation: { energy: 0.1, instrumentalness: 0.9, valence: 0.5 },
    driving: { energy: 0.7, danceability: 0.6, valence: 0.7 },
    cooking: { energy: 0.6, danceability: 0.6, valence: 0.7 },
    reading: { energy: 0.2, instrumentalness: 0.7, valence: 0.5 }
  }

  // Start with mood-based features
  let features = { ...moodFeatures[moodLower] } || { valence: 0.5, energy: 0.5, danceability: 0.5 }

  // Apply activity adjustments
  if (activityLower && activityFeatures[activityLower]) {
    features = { ...features, ...activityFeatures[activityLower] }
  }

  // Override with explicit energy level if provided
  if (energyLevel !== undefined) {
    features.energy = Math.max(0, Math.min(1, energyLevel))
  }

  return features
}

async function getSpotifyRecommendations(
  accessToken: string,
  audioFeatures: any,
  genres: string[],
  limit: number
): Promise<any[]> {
  try {
    // Build the recommendations query
    const params = new URLSearchParams({
      limit: limit.toString(),
      market: 'US'
    })

    // Add audio feature targets
    if (audioFeatures.valence !== undefined) {
      params.append('target_valence', audioFeatures.valence.toString())
    }
    if (audioFeatures.energy !== undefined) {
      params.append('target_energy', audioFeatures.energy.toString())
    }
    if (audioFeatures.danceability !== undefined) {
      params.append('target_danceability', audioFeatures.danceability.toString())
    }
    if (audioFeatures.instrumentalness !== undefined) {
      params.append('target_instrumentalness', audioFeatures.instrumentalness.toString())
    }
    if (audioFeatures.tempo !== undefined) {
      params.append('target_tempo', audioFeatures.tempo.toString())
    }

    // Add genres if specified
    if (genres.length > 0) {
      params.append('seed_genres', genres.slice(0, 5).join(',')) // Max 5 genres
    } else {
      // Use default popular genres if none specified
      params.append('seed_genres', 'pop,rock,indie,electronic,alternative')
    }

    const response = await fetch(
      `https://api.spotify.com/v1/recommendations?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Spotify API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    
    // Get audio features for the recommended tracks
    if (data.tracks && data.tracks.length > 0) {
      const trackIds = data.tracks.map((track: any) => track.id).join(',')
      const audioFeaturesResponse = await fetch(
        `https://api.spotify.com/v1/audio-features?ids=${trackIds}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (audioFeaturesResponse.ok) {
        const audioFeaturesData = await audioFeaturesResponse.json()
        // Attach audio features to each track
        data.tracks.forEach((track: any, index: number) => {
          track.audio_features = audioFeaturesData.audio_features[index]
        })
      }
    }

    return data.tracks || []

  } catch (error) {
    console.error('Spotify recommendations error:', error)
    return []
  }
}