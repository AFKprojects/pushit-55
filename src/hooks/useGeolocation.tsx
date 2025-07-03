
import { useState, useEffect } from 'react';

interface GeolocationData {
  country: string | null;
  loading: boolean;
  error: string | null;
}

export const useGeolocation = () => {
  const [geoData, setGeoData] = useState<GeolocationData>({
    country: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Try to get country from IP-based geolocation API
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        console.log('Geolocation API response:', data);
        
        if (data.country_name) {
          console.log('Setting country to:', data.country_name);
          setGeoData({
            country: data.country_name,
            loading: false,
            error: null
          });
        } else {
          // Fallback to browser geolocation
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                try {
                  // Use reverse geocoding to get country from coordinates
                  const { latitude, longitude } = position.coords;
                  const reverseGeoResponse = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                  );
                  const reverseGeoData = await reverseGeoResponse.json();
                  
                  setGeoData({
                    country: reverseGeoData.countryName || 'Unknown',
                    loading: false,
                    error: null
                  });
                } catch (error) {
                  setGeoData({
                    country: 'Unknown',
                    loading: false,
                    error: 'Could not determine location'
                  });
                }
              },
              () => {
                setGeoData({
                  country: 'Unknown',
                  loading: false,
                  error: 'Location access denied'
                });
              }
            );
          } else {
            setGeoData({
              country: 'Unknown',
              loading: false,
              error: 'Geolocation not supported'
            });
          }
        }
      } catch (error) {
        console.error('Error detecting country:', error);
        setGeoData({
          country: 'Unknown',
          loading: false,
          error: 'Failed to detect location'
        });
      }
    };

    detectCountry();
  }, []);

  return geoData;
};
