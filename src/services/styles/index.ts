import { v4 as uuidv4 } from 'uuid';
import supabase, { handleSupabaseError } from '../supabase/client';
import type { Database } from '../../types/supabase';

export type Style = Database['public']['Tables']['styles']['Row'];
export type StyleInsert = Database['public']['Tables']['styles']['Insert'];
export type StyleUpdate = Database['public']['Tables']['styles']['Update'];

// Default values for new styles
const DEFAULT_PAIN_POINTS: string[] = [];

/**
 * Fetch all styles for a user
 * @param userId - The user ID to fetch styles for
 * @returns Promise with array of styles
 */
export const getUserStyles = async (userId: string): Promise<Style[]> => {
  try {
    const { data, error } = await supabase
      .from('styles')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching styles:', error);
    throw new Error(handleSupabaseError(error, 'Failed to fetch styles'));
  }
};

/**
 * Fetch a single style by ID
 * @param styleId - The style ID to fetch
 * @returns Promise with the style or null if not found
 */
export const getStyleById = async (styleId: string): Promise<Style | null> => {
  try {
    const { data, error } = await supabase
      .from('styles')
      .select('*')
      .eq('id', styleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching style:', error);
    throw new Error(handleSupabaseError(error, 'Failed to fetch style'));
  }
};

/**
 * Create a new style
 * @param style - The style data to insert
 * @returns Promise with the created style
 */
export const createStyle = async (style: Omit<StyleInsert, 'id'>): Promise<Style> => {
  try {
    console.log('createStyle called with data:', style);
    
    // Verify user_id is provided
    if (!style.user_id) {
      console.error('Missing user_id in style data');
      throw new Error('User ID is required to create a style');
    }
    
    // Ensure all required fields are present with defaults if needed
    const newStyle: StyleInsert = {
      ...style,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pain_points: style.pain_points || DEFAULT_PAIN_POINTS,
      // Ensure backward compatibility
      content: style.content || style.communication_style,
      description: style.description || style.hero_story || null
    };

    console.log('Prepared style data for insertion:', newStyle);
    console.log('Supabase client initialized:', !!supabase);
    
    const { data, error } = await supabase
      .from('styles')
      .insert(newStyle)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    
    console.log('Style created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error creating style:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error(handleSupabaseError(error, 'Failed to create style'));
  }
};

/**
 * Update an existing style
 * @param styleId - The ID of the style to update
 * @param updates - The style data to update
 * @returns Promise with the updated style
 */
export const updateStyle = async (
  styleId: string, 
  updates: Omit<StyleUpdate, 'id' | 'created_at' | 'updated_at'>
): Promise<Style> => {
  try {
    // Ensure backward compatibility between old and new fields
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
      // If communication_style is updated, also update content for backward compatibility
      content: updates.communication_style || updates.content,
      // If hero_story is updated, also update description for backward compatibility
      description: updates.hero_story || updates.description
    };

    const { data, error } = await supabase
      .from('styles')
      .update(updatedFields)
      .eq('id', styleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating style:', error);
    throw new Error(handleSupabaseError(error, 'Failed to update style'));
  }
};

/**
 * Delete a style
 * @param styleId - The ID of the style to delete
 * @returns Promise with success status
 */
export const deleteStyle = async (styleId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('styles')
      .delete()
      .eq('id', styleId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting style:', error);
    throw new Error(handleSupabaseError(error, 'Failed to delete style'));
  }
};
