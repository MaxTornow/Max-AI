import { v4 as uuidv4 } from 'uuid';
import supabase, { handleSupabaseError } from '../supabase/client';
import { Database } from '../../types/supabase';

export type RewriteVariation = {
  id: string;
  content: string;
  created_at: string;
};

export type RewriteParameters = {
  niche: string;
  target_audience: string;
  pain_points: string[];
  communication_style: string;
  hero_story: string | null;
};

export type RewriteInsert = Database['public']['Tables']['rewrites']['Insert'];
export type RewriteRow = Database['public']['Tables']['rewrites']['Row'];

/**
 * Check if a rewrite with the same content already exists
 * @param userId - The user ID
 * @param originalUrl - The original video URL
 * @param content - The rewrite content
 * @returns Promise with boolean indicating if duplicate exists
 */
export const checkDuplicateRewrite = async (
  userId: string,
  originalUrl: string,
  content: string
): Promise<{ isDuplicate: boolean; existingRewrite: RewriteRow | null; error: string | null }> => {
  try {
    // Get all rewrites for this user and URL
    const { data, error } = await supabase
      .from('rewrites')
      .select('*')
      .eq('user_id', userId)
      .eq('original_url', originalUrl);

    if (error) {
      return { isDuplicate: false, existingRewrite: null, error: handleSupabaseError(error) };
    }

    if (!data || data.length === 0) {
      return { isDuplicate: false, existingRewrite: null, error: null };
    }

    // Check if any of the variations contain the same content
    for (const rewrite of data) {
      const hasDuplicate = rewrite.variations.some(
        (variation: RewriteVariation) => variation.content.trim() === content.trim()
      );

      if (hasDuplicate) {
        return { isDuplicate: true, existingRewrite: rewrite, error: null };
      }
    }

    return { isDuplicate: false, existingRewrite: null, error: null };
  } catch (error: any) {
    return { 
      isDuplicate: false, 
      existingRewrite: null, 
      error: handleSupabaseError(error, 'Failed to check for duplicate rewrites') 
    };
  }
};

/**
 * Save a single rewrite script to Supabase
 * @param userId - The user ID
 * @param originalUrl - The original video URL
 * @param platform - The platform (tiktok or instagram)
 * @param content - The rewrite content
 * @param parameters - The rewrite parameters
 * @returns Promise with the saved rewrite or error
 */
export const saveRewriteScript = async (
  userId: string,
  originalUrl: string,
  platform: 'tiktok' | 'instagram',
  content: string,
  parameters: RewriteParameters
): Promise<{ data: RewriteRow | null; error: string | null; isDuplicate: boolean }> => {
  try {
    // First check if this is a duplicate
    const { isDuplicate, existingRewrite, error: checkError } = await checkDuplicateRewrite(
      userId,
      originalUrl,
      content
    );

    if (checkError) {
      return { data: null, error: checkError, isDuplicate: false };
    }

    // If it's a duplicate, return early
    if (isDuplicate) {
      return { data: existingRewrite, error: null, isDuplicate: true };
    }

    // Create a variation object
    const variation: RewriteVariation = {
      id: uuidv4(),
      content,
      created_at: new Date().toISOString(),
    };

    // Create the rewrite object
    const rewrite: RewriteInsert = {
      user_id: userId,
      original_url: originalUrl,
      platform,
      variations: [variation],
      parameters,
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('rewrites')
      .insert(rewrite)
      .select()
      .single();

    if (error) {
      return { data: null, error: handleSupabaseError(error), isDuplicate: false };
    }

    return { data, error: null, isDuplicate: false };
  } catch (error: any) {
    return { 
      data: null, 
      error: handleSupabaseError(error, 'Failed to save rewrite'), 
      isDuplicate: false 
    };
  }
};

/**
 * Get all rewrites for a user
 * @param userId - The user ID
 * @returns Promise with the rewrites or error
 */
export const getUserRewrites = async (
  userId: string
): Promise<{ data: RewriteRow[] | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('rewrites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: handleSupabaseError(error) };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: handleSupabaseError(error, 'Failed to fetch rewrites') };
  }
};

/**
 * Delete a rewrite from Supabase
 * @param rewriteId - The ID of the rewrite to delete
 * @returns Promise with success status or error
 */
export const deleteRewrite = async (
  rewriteId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('rewrites')
      .delete()
      .eq('id', rewriteId);

    if (error) {
      return { success: false, error: handleSupabaseError(error) };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { 
      success: false, 
      error: handleSupabaseError(error, 'Failed to delete rewrite') 
    };
  }
};
