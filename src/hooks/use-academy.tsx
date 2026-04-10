"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface AcademySettings {
  academy_name: string;
  logo_url: string | null;
  category: string | null;
}

interface AcademyContextType {
  academyId: string | null;
  userId: string | null;
  settings: AcademySettings | null;
  loading: boolean;
  error: Error | null;
}

const AcademyContext = createContext<AcademyContextType | undefined>(undefined);

export function AcademyProvider({ children }: { children: React.ReactNode }) {
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AcademySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function getAcademyContext() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session || !session.user) {
          setLoading(false);
          return;
        }

        const user = session.user;
        setUserId(user.id);

        // Intento 1: Metadatos del usuario
        let aId = user.user_metadata?.academy_id;

        // Intento 2: Perfil del usuario
        if (!aId) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('academy_id')
            .eq('id', user.id)
            .single();
          
          if (profile?.academy_id) {
            aId = profile.academy_id;
          }
        }

        // Intento 3: Buscar en la tabla academies por dueño
        if (!aId) {
          const { data: academy } = await supabase
            .from('academies')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle();
          
          if (academy?.id) {
            aId = academy.id;
          }
        }

        // FALLBACK DE EMERGENCIA: Usar el user.id como academy_id
        if (!aId) {
          console.warn("No se detectó academy_id, usando user.id como fallback de emergencia.");
          aId = user.id;
        }

        setAcademyId(aId);

        // Ya que tenemos el aId, traemos los settings
        const { data: settingsData } = await supabase
          .from('settings')
          .select('academy_name, logo_url, category')
          .eq('academy_id', aId)
          .maybeSingle();

        if (settingsData) {
          setSettings({
            academy_name: settingsData.academy_name || "Sahara",
            logo_url: settingsData.logo_url,
            category: settingsData.category || "Academy Manager"
          });
        } else {
          setSettings({
            academy_name: "Administración",
            logo_url: null,
            category: "Panel Central"
          });
        }

      } catch (err) {
        console.error("Error retrieving academy context:", err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    getAcademyContext();
  }, []);

  return (
    <AcademyContext.Provider value={{ academyId, userId, settings, loading, error }}>
      {children}
    </AcademyContext.Provider>
  );
}

export function useAcademy() {
  const context = useContext(AcademyContext);
  if (context === undefined) {
    throw new Error('useAcademy must be used within an AcademyProvider');
  }
  return context;
}
