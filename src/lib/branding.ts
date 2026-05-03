import type { Company } from '../types';

export interface BrandConfig {
  company_id: string;
  company_name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  tagline?: string;
  website?: string;
}

// Default ShipCore brand
const DEFAULT_BRAND: BrandConfig = {
  company_id: '00000000-0000-0000-0000-000000000000',
  company_name: 'ShipCore ERP',
  logo_url: '/veloryn-logo.jpg',
  primary_color: '#1D4ED8',
  secondary_color: '#1e40af',
  accent_color: '#16a34a',
  font_family: 'IBM Plex Sans, system-ui, sans-serif',
  tagline: 'Smart Logistics ERP for LCL, CHA & Freight Forwarders',
  website: 'https://shipcore.vercel.app',
};

// Cache for brand configs (in-memory)
const brandCache = new Map<string, BrandConfig>();

export async function getBrandConfig(companyId: string): Promise<BrandConfig | null> {
  // Check cache first
  if (brandCache.has(companyId)) {
    return brandCache.get(companyId)!;
  }

  // In real implementation, fetch from Supabase
  // const { data } = await supabase
  //   .from('companies')
  //   .select('id, name, logo_url')
  //   .eq('id', companyId)
  //   .single();
  // 
  // if (data) {
  //   const brand: BrandConfig = {
  //     company_id: data.id,
  //     company_name: data.name,
  //     logo_url: data.logo_url || DEFAULT_BRAND.logo_url,
  //     primary_color: data.primary_color || DEFAULT_BRAND.primary_color,
  //     ...DEFAULT_BRAND,
  //   };
  //   brandCache.set(companyId, brand);
  //   return brand;
  // }

  // Return default for now
  return DEFAULT_BRAND;
}

export function applyBranding(brand: BrandConfig): void {
  // Apply CSS custom properties
  const root = document.documentElement;
  root.style.setProperty('--color-primary', brand.primary_color);
  root.style.setProperty('--color-secondary', brand.secondary_color);
  root.style.setProperty('--color-accent', brand.accent_color);
  root.style.setProperty('--font-family', brand.font_family);
}

export function getBrandForPDF(brand: BrandConfig): { 
  header: { logo_url?: string; company_name: string; tagline?: string };
  colors: { primary: string; secondary: string };
} {
  return {
    header: {
      logo_url: brand.logo_url,
      company_name: brand.company_name,
      tagline: brand.tagline,
    },
    colors: {
      primary: brand.primary_color,
      secondary: brand.secondary_color,
    },
  };
}
