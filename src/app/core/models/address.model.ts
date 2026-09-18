export interface EmployeeAddress {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  validatedAt: string;
}

export interface EmployeeAddressUpdateRequest {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

/** Subset of the Geoapify autocomplete feature properties we use. */
export interface GeoapifyFeature {
  properties: {
    formatted: string;
    address_line1: string;
    address_line2: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state_code?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
    country?: string;
    lat: number;
    lon: number;
    place_id: string;
  };
}

export interface GeoapifyAutocompleteResponse {
  features: GeoapifyFeature[];
}
