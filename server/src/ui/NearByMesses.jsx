import React, { useState, useEffect, useRef } from 'react';
import ReactMapGL, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2lkZGhhcnRoMDAwMjciLCJhIjoiY2xxNHF3dHQ3MGI4ZzJwbGhidm4xcXpxNyJ9.HRP80FyJvTuJrvCagzw8Aw'; // Replace with your actual token

const NearbyMesses = () => {
    const [messes, setMesses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [searchLocation, setSearchLocation] = useState(null); // NEW: Custom search location
    const [radius, setRadius] = useState(5000);
    const [selectedMess, setSelectedMess] = useState(null);
    const [showMap, setShowMap] = useState(true);
    const [showLocationPopup, setShowLocationPopup] = useState(false); // NEW: Show popup for custom pin
    const [locationMode, setLocationMode] = useState('live'); // NEW: 'live' or 'custom'
    const mapRef = useRef();

    // Map viewport state
    const [viewport, setViewport] = useState({
        longitude: 77.1025, // Default Delhi coordinates
        latitude: 28.7041,
        zoom: 12,
        width: '100%',
        height: 500
    });

    // Inline styles (keeping existing + new ones)
    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        header: {
            textAlign: 'center',
            marginBottom: '30px'
        },
        title: {
            color: '#333',
            marginBottom: '15px'
        },
        controlsRow: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap',
            marginBottom: '20px'
        },
        locationModeRow: { // NEW: Location mode selector
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
        },
        refreshBtn: {
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'background-color 0.3s'
        },
        locationModeBtn: { // NEW: Mode toggle buttons
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background-color 0.3s'
        },
        activeModeBtn: { // NEW: Active mode button
            backgroundColor: '#28a745'
        },
        toggleBtn: {
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
        },
        select: {
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            marginLeft: '10px'
        },
        mapContainer: {
            width: '100%',
            height: '500px',
            marginBottom: '30px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #ddd'
        },
        marker: {
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: '#e63946',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            fontSize: '12px'
        },
        userMarker: {
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#007bff',
            border: '3px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        },
        searchMarker: { // NEW: Custom search location marker
            width: '25px',
            height: '25px',
            borderRadius: '50%',
            backgroundColor: '#ffc107',
            border: '3px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            cursor: 'grab'
        },
        searchMarkerDragging: { // NEW: Dragging state
            cursor: 'grabbing'
        },
        popup: {
            maxWidth: '250px'
        },
        popupTitle: {
            margin: '0 0 8px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333'
        },
        popupText: {
            margin: '4px 0',
            fontSize: '13px',
            color: '#666'
        },
        popupDistance: {
            backgroundColor: '#28a745',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '10px',
            fontSize: '11px',
            display: 'inline-block',
            marginTop: '5px'
        },
        viewDetailsBtn: {
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            marginTop: '8px'
        },
        locationInfo: {
            backgroundColor: '#e7f3ff',
            padding: '10px',
            borderRadius: '6px',
            margin: '15px 0',
            fontSize: '14px',
            color: '#0066cc'
        },
        customLocationInfo: { // NEW: Custom location info
            backgroundColor: '#fff3cd',
            padding: '10px',
            borderRadius: '6px',
            margin: '15px 0',
            fontSize: '14px',
            color: '#856404'
        },
        error: {
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '15px',
            borderRadius: '6px',
            margin: '20px 0',
            textAlign: 'center'
        },
        loading: {
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666',
            fontSize: '18px'
        },
        messCard: {
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '15px',
            margin: '10px 0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            transition: 'all 0.3s'
        },
        messHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
        },
        messTitle: {
            margin: 0,
            fontSize: '18px',
            color: '#333'
        },
        distance: {
            backgroundColor: '#28a745',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
        }
    };

    // Get user's current location
    const getUserLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    resolve(coords);
                },
                (error) => {
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            reject(new Error('Location access denied by user'));
                            break;
                        case error.POSITION_UNAVAILABLE:
                            reject(new Error('Location information unavailable'));
                            break;
                        case error.TIMEOUT:
                            reject(new Error('Location request timed out'));
                            break;
                        default:
                            reject(new Error('Unknown location error'));
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    };

    // NEW: Switch between live and custom location modes
    const switchLocationMode = (mode) => {
        setLocationMode(mode);
        if (mode === 'live') {
            setSearchLocation(null);
            setShowLocationPopup(false);
            fetchNearbyMesses(); // Search from user's live location
        } else {
            // Set initial custom location to current map center
            const customLoc = {
                latitude: viewport.latitude,
                longitude: viewport.longitude
            };
            setSearchLocation(customLoc);
            setShowLocationPopup(true);
        }
    };

    // NEW: Handle map click to place custom pin
    const onMapClick = (event) => {
        if (locationMode === 'custom') {
            const newLocation = {
                latitude: event.lngLat.lat,
                longitude: event.lngLat.lng
            };
            setSearchLocation(newLocation);
            setShowLocationPopup(true);
        }
    };

    // NEW: Handle custom pin drag
    const onCustomPinDragEnd = (event) => {
        const newLocation = {
            latitude: event.lngLat.lat,
            longitude: event.lngLat.lng
        };
        setSearchLocation(newLocation);
        setShowLocationPopup(true);
    };

    // NEW: Search from custom location
    const searchFromCustomLocation = async () => {
        if (!searchLocation) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('https://taste-trove-q3kw.vercel.app/listings/nearby', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    latitude: searchLocation.latitude,
                    longitude: searchLocation.longitude,
                    radius: radius,
                    limit: 20
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch nearby messes');
            }

            setMesses(data.messes);
            console.log(`Found ${data.count} nearby messes from custom location`);

        } catch (err) {
            setError(err.message);
            console.error('Error finding nearby messes:', err);
        } finally {
            setLoading(false);
        }
    };

    // Enhanced fetch nearby messes (handles both modes)
    const fetchNearbyMesses = async () => {
        if (locationMode === 'custom' && searchLocation) {
            await searchFromCustomLocation();
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const location = await getUserLocation();
            setUserLocation(location);

            // Update map viewport to user location
            setViewport(prev => ({
                ...prev,
                longitude: location.longitude,
                latitude: location.latitude
            }));

            const response = await fetch('https://taste-trove-q3kw.vercel.app/listings/nearby', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    radius: radius,
                    limit: 20
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch nearby messes');
            }

            setMesses(data.messes);
            console.log(`Found ${data.count} nearby messes`);

        } catch (err) {
            setError(err.message);
            console.error('Error finding nearby messes:', err);
        } finally {
            setLoading(false);
        }
    };

    // Search with different radius (enhanced for both modes)
    const searchWithRadius = async (newRadius) => {
        setRadius(newRadius);
        
        if (locationMode === 'custom' && searchLocation) {
            setLoading(true);
            try {
                const response = await fetch('https://taste-trove-q3kw.vercel.app/listings/nearby', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        latitude: searchLocation.latitude,
                        longitude: searchLocation.longitude,
                        radius: newRadius,
                        limit: 20
                    })
                });

                const data = await response.json();
                if (data.success) {
                    setMesses(data.messes);
                }
            } catch (err) {
                setError('Failed to search with new radius');
            } finally {
                setLoading(false);
            }
        } else if (userLocation) {
            setLoading(true);
            try {
                const response = await fetch('https://taste-trove-q3kw.vercel.app/listings/nearby', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        radius: newRadius,
                        limit: 20
                    })
                });

                const data = await response.json();
                if (data.success) {
                    setMesses(data.messes);
                }
            } catch (err) {
                setError('Failed to search with new radius');
            } finally {
                setLoading(false);
            }
        }
    };

    // Focus on mess marker on map
    const focusOnMess = (mess) => {
        if (mess.location?.coordinates) {
            setViewport(prev => ({
                ...prev,
                longitude: mess.location.coordinates[0],
                latitude: mess.location.coordinates[1],
                zoom: 15
            }));
            setSelectedMess(mess);
        }
    };

    // Auto-search on component mount
    useEffect(() => {
        fetchNearbyMesses();
    }, []);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>🍽️ Find Messes Near You</h2>
                
                {/* NEW: Location Mode Selector */}
                <div style={styles.locationModeRow}>
                    <span style={{fontWeight: 'bold', color: '#495057'}}>Search from:</span>
                    <button 
                        onClick={() => switchLocationMode('live')}
                        style={{
                            ...styles.locationModeBtn,
                            ...(locationMode === 'live' ? styles.activeModeBtn : {})
                        }}
                    >
                        📍 My Current Location
                    </button>
                    <button 
                        onClick={() => switchLocationMode('custom')}
                        style={{
                            ...styles.locationModeBtn,
                            ...(locationMode === 'custom' ? styles.activeModeBtn : {})
                        }}
                    >
                        📌 Custom Location
                    </button>
                </div>
                
                <div style={styles.controlsRow}>
                    <button 
                        onClick={fetchNearbyMesses} 
                        disabled={loading}
                        style={{
                            ...styles.refreshBtn,
                            ...(loading ? {backgroundColor: '#ccc', cursor: 'not-allowed'} : {})
                        }}
                    >
                        {loading ? '🔄 Searching...' : '🔍 Search Messes'}
                    </button>

                    <button 
                        onClick={() => setShowMap(!showMap)}
                        style={styles.toggleBtn}
                    >
                        {showMap ? '📋 Show List' : '🗺️ Show Map'}
                    </button>

                    <div>
                        <label>Radius: </label>
                        <select 
                            value={radius} 
                            onChange={(e) => searchWithRadius(parseInt(e.target.value))}
                            disabled={loading}
                            style={styles.select}
                        >
                            <option value={1000}>1 km</option>
                            <option value={2000}>2 km</option>
                            <option value={5000}>5 km</option>
                            <option value={10000}>10 km</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div style={styles.error}>
                    <p>❌ {error}</p>
                    <button onClick={fetchNearbyMesses}>Try Again</button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div style={styles.loading}>
                    <p>🔍 Searching for nearby messes...</p>
                </div>
            )}

            {/* Location Info Display */}
            {locationMode === 'live' && userLocation && !loading && (
                <div style={styles.locationInfo}>
                    <p>📍 Searching from your location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}</p>
                    <p>🔍 Search radius: {radius/1000} km | Found {messes.length} messes</p>
                </div>
            )}

            {/* Custom Location Info Display */}
            {locationMode === 'custom' && searchLocation && !loading && (
                <div style={styles.customLocationInfo}>
                    <p>📌 Searching from custom location: {searchLocation.latitude.toFixed(4)}, {searchLocation.longitude.toFixed(4)}</p>
                    <p>🔍 Search radius: {radius/1000} km | Found {messes.length} messes</p>
                    <p style={{fontSize: '12px', fontStyle: 'italic'}}>💡 Click on map or drag the yellow pin to change search location</p>
                </div>
            )}

            {/* Map View */}
            {showMap && !loading && (
                <div style={styles.mapContainer}>
                    <ReactMapGL
                        {...viewport}
                        onMove={(evt) => setViewport(evt.viewState)}
                        mapboxAccessToken={MAPBOX_TOKEN}
                        mapStyle="mapbox://styles/mapbox/streets-v11"
                        ref={mapRef}
                        onClick={onMapClick}
                        cursor={locationMode === 'custom' ? 'crosshair' : 'default'}
                    >
                        {/* User Location Marker (Live mode) */}
                        {locationMode === 'live' && userLocation && (
                            <Marker
                                longitude={userLocation.longitude}
                                latitude={userLocation.latitude}
                            >
                                <div 
                                    style={styles.userMarker}
                                    title="Your current location"
                                />
                            </Marker>
                        )}

                        {/* Custom Search Location Marker (Custom mode) */}
                        {locationMode === 'custom' && searchLocation && (
                            <Marker
                                longitude={searchLocation.longitude}
                                latitude={searchLocation.latitude}
                                draggable={true}
                                onDragEnd={onCustomPinDragEnd}
                            >
                                <div 
                                    style={styles.searchMarker}
                                    title="Search location (drag to move)"
                                />
                            </Marker>
                        )}

                        {/* Mess Markers */}
                        {messes.map((mess, index) => (
                            mess.location?.coordinates && (
                                <Marker
                                    key={mess._id}
                                    longitude={mess.location.coordinates[0]}
                                    latitude={mess.location.coordinates[1]}
                                >
                                    <div
                                        style={styles.marker}
                                        onClick={() => setSelectedMess(mess)}
                                        title={mess.name}
                                    >
                                        {index + 1}
                                    </div>
                                </Marker>
                            )
                        ))}

                        {/* Popup for selected mess */}
                        {selectedMess && selectedMess.location?.coordinates && (
                            <Popup
                                longitude={selectedMess.location.coordinates[0]}
                                latitude={selectedMess.location.coordinates[1]}
                                onClose={() => setSelectedMess(null)}
                                closeOnClick={false}
                                anchor="bottom"
                            >
                                <div style={styles.popup}>
                                    <h3 style={styles.popupTitle}>{selectedMess.name}</h3>
                                    <p style={styles.popupText}>
                                        📍 {selectedMess.address || 'Address not provided'}
                                    </p>
                                    {selectedMess.pricePerMeal && (
                                        <p style={styles.popupText}>💰 ₹{selectedMess.pricePerMeal}/meal</p>
                                    )}
                                    {selectedMess.rating && (
                                        <p style={styles.popupText}>⭐ {selectedMess.rating}/5</p>
                                    )}
                                    <span style={styles.popupDistance}>
                                        {selectedMess.distanceText}
                                    </span>
                                    <br />
                                    <button 
                                        onClick={() => window.location.href = `/listing/${selectedMess._id}`}
                                        style={styles.viewDetailsBtn}
                                    >
                                        View Details
                                    </button>
                                </div>
                            </Popup>
                        )}

                        {/* Custom Location Selection Popup */}
                        {showLocationPopup && locationMode === 'custom' && searchLocation && (
                            <Popup
                                longitude={searchLocation.longitude}
                                latitude={searchLocation.latitude}
                                onClose={() => setShowLocationPopup(false)}
                                closeOnClick={false}
                                anchor="top"
                            >
                                <div style={styles.popup}>
                                    <h4 style={styles.popupTitle}>🔍 Search Location</h4>
                                    <p style={styles.popupText}>
                                        📌 Lat: {searchLocation.latitude.toFixed(6)}
                                    </p>
                                    <p style={styles.popupText}>
                                        📌 Lng: {searchLocation.longitude.toFixed(6)}
                                    </p>
                                    <button 
                                        onClick={searchFromCustomLocation}
                                        style={styles.viewDetailsBtn}
                                    >
                                        🔍 Search Here
                                    </button>
                                </div>
                            </Popup>
                        )}
                    </ReactMapGL>
                </div>
            )}

            {/* List View */}
            {!showMap && !loading && (
                <div>
                    {messes.length === 0 ? (
                        <p style={styles.loading}>No nearby messes found. Try increasing the search radius or changing location.</p>
                    ) : (
                        messes.map((mess, index) => (
                            <div 
                                key={mess._id} 
                                style={styles.messCard}
                                onClick={() => focusOnMess(mess)}
                            >
                                <div style={styles.messHeader}>
                                    <h3 style={styles.messTitle}>{mess.name}</h3>
                                    <span style={styles.distance}>{mess.distanceText}</span>
                                </div>
                                
                                <p>📍 {mess.address || 'Address not provided'}</p>
                                {mess.pricePerMeal && (
                                    <p>💰 ₹{mess.pricePerMeal} per meal</p>
                                )}
                                {mess.rating && (
                                    <p>⭐ {mess.rating}/5</p>
                                )}
                                <p style={{fontSize: '12px', color: '#888'}}>
                                    Click to view on map
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default NearbyMesses;
