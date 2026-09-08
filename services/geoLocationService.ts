// Geo-Location Service - Office Location Verification
// Security: Prevents unauthorized remote login unless admin explicitly allows

interface OfficeLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // Allowed radius from office center
}

interface LocationCheckResult {
  allowed: boolean;
  distance?: number;
  error?: string;
  reason?: string;
}

export interface EmployeeLocationPermission {
  employeeId: string;
  allowRemoteLogin: boolean;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

class GeoLocationService {
  // Default office location: 2 Number, Sah Aman Lane, Kolkata 700023
  private defaultOffice: OfficeLocation = {
    name: 'Legal Success India - Main Office',
    address: '2 Number, Sah Aman Lane, Kolkata 700023',
    latitude: 22.5726, // Placeholder - will be updated via admin panel
    longitude: 88.3639, // Placeholder - will be updated via admin panel
    radiusMeters: 1 // STRICT 1 meter radius
  };

  /**
   * Get current user's GPS location
   */
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          let errorMessage = 'Unable to retrieve your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please check your GPS settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true, // Use GPS for accurate location
          timeout: 10000, // 10 second timeout
          maximumAge: 0 // Don't use cached location
        }
      );
    });
  }

  /**
   * Calculate distance between two GPS coordinates (Haversine formula)
   * Returns distance in meters
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Verify if user is within office premises
   */
  async verifyOfficeLocation(
    officeLocation?: OfficeLocation
  ): Promise<LocationCheckResult> {
    try {
      const office = officeLocation || this.defaultOffice;
      
      // Get current location
      const userLocation = await this.getCurrentLocation();

      // Calculate distance from office
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        office.latitude,
        office.longitude
      );

      console.log('📍 Location Check:', {
        userLat: userLocation.latitude,
        userLon: userLocation.longitude,
        officeLat: office.latitude,
        officeLon: office.longitude,
        distance: `${distance.toFixed(2)}m`,
        allowed: distance <= office.radiusMeters
      });

      // Check if within allowed radius
      if (distance <= office.radiusMeters) {
        return {
          allowed: true,
          distance: Math.round(distance),
          reason: `Within office premises (${Math.round(distance)}m from center)`
        };
      } else {
        return {
          allowed: false,
          distance: Math.round(distance),
          reason: `You are ${Math.round(distance)}m away from office. Login only allowed within ${office.radiusMeters}m radius.`
        };
      }
    } catch (error: any) {
      console.error('❌ Location verification error:', error);
      return {
        allowed: false,
        error: error.message,
        reason: 'Unable to verify location. Please enable GPS and try again.'
      };
    }
  }

  /**
   * Get office location from settings
   */
  getDefaultOffice(): OfficeLocation {
    return { ...this.defaultOffice };
  }

  /**
   * Update office location (admin only)
   */
  updateOfficeLocation(location: OfficeLocation): void {
    this.defaultOffice = { ...location };
    console.log('✅ Office location updated:', location);
  }

  /**
   * Geocode address to coordinates using free Nominatim API
   * (OpenStreetMap's geocoding service)
   */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'LegalSuccessIndia-AttendancePortal/1.0'
          }
        }
      );

      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  }

  /**
   * Get formatted address from coordinates (Reverse Geocoding)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            'User-Agent': 'LegalSuccessIndia-AttendancePortal/1.0'
          }
        }
      );

      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      return null;
    }
  }
}

export const geoLocationService = new GeoLocationService();
