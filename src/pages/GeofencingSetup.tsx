import { useState, useEffect } from 'react';
import api from '../utils/api';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const OFFICE_LOCATION_DEFAULT = {
    latitude: 28.62884,
    longitude: 77.37633,
    radius: 300
};

const LocationMarker = ({ position, setPosition, radius }: { position: { lat: number, lng: number }, setPosition: (pos: { lat: number, lng: number }) => void, radius: number }) => {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <>
            <Marker position={position}></Marker>
            <Circle center={position} radius={radius} pathOptions={{ fillColor: 'blue', fillOpacity: 0.1, color: 'blue' }} />
        </>
    );
};

const GeofencingSetup = () => {
    const [offices, setOffices] = useState<any[]>([]);
    const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
    const [officeLocation, setOfficeLocation] = useState(OFFICE_LOCATION_DEFAULT);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        loadOffices();
    }, []);

    const loadOffices = async () => {
        try {
            const data = await api.getOfficeLocations();
            setOffices(data);
            if (data.length > 0) {
                setSelectedOfficeId(data[0].id);
                setOfficeLocation({
                    latitude: data[0].latitude,
                    longitude: data[0].longitude,
                    radius: data[0].radius
                });
            }
        } catch (error) {
            console.error('Failed to load offices:', error);
        }
    };

    const handleOfficeSelect = (officeId: number) => {
        const office = offices.find(o => o.id === officeId);
        if (office) {
            setSelectedOfficeId(officeId);
            setOfficeLocation({
                latitude: office.latitude,
                longitude: office.longitude,
                radius: office.radius
            });
        }
    };

    const handleSave = async () => {
        if (!selectedOfficeId) {
            alert('Please select an office first');
            return;
        }

        try {
            const res = await api.updateOfficeLocation({
                id: selectedOfficeId,
                name: offices.find(o => o.id === selectedOfficeId)?.name,
                latitude: officeLocation.latitude,
                longitude: officeLocation.longitude,
                radius: officeLocation.radius
            });

            if (res.success) {
                setStatusMessage('Office location updated successfully!');
                loadOffices();
                setTimeout(() => setStatusMessage(''), 3000);
            } else {
                alert('Failed to update: ' + res.error);
            }
        } catch (error: any) {
            alert('Failed to update: ' + (error.message || 'Unknown error'));
        }
    };

    const handleSetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setOfficeLocation(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                alert('Updated to your current location! Click Save to apply.');
            },
            (error) => {
                alert('Error getting location: ' + error.message);
            }
        );
    };

    const handleReset = () => {
        const office = offices.find(o => o.id === selectedOfficeId);
        if (office && confirm('Reset to saved coordinates for this office?')) {
            setOfficeLocation({
                latitude: office.latitude,
                longitude: office.longitude,
                radius: office.radius
            });
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h1>Geofencing Setup (Admin)</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Set the office perimeter for employee attendance.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn" onClick={handleSetCurrentLocation} style={{ background: '#3b82f6', color: 'white' }}>Set to My Location</button>
                    <button className="btn" onClick={handleReset} style={{ background: 'var(--secondary)', color: 'white' }}>Reset Default</button>
                    <button className="btn btn-primary" onClick={handleSave}>Save Location</button>
                </div>
            </div>

            {offices.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <h3>No Office Locations Found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Please add office locations first from the Office Management page
                    </p>
                    <a href="#/office-management" className="btn btn-primary">Go to Office Management</a>
                </div>
            ) : (
                <>
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                            Select Office Location
                        </label>
                        <select
                            className="form-input"
                            value={selectedOfficeId || ''}
                            onChange={(e) => handleOfficeSelect(parseInt(e.target.value))}
                            style={{ cursor: 'pointer', maxWidth: '400px' }}
                        >
                            {offices.map(office => (
                                <option key={office.id} value={office.id}>
                                    {office.name} - {office.radius}m radius
                                </option>
                            ))}
                        </select>
                    </div>

                    {statusMessage && (
                        <div style={{
                            padding: '10px',
                            marginBottom: '1rem',
                            borderRadius: '8px',
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#22c55e',
                            border: '1px solid #22c55e'
                        }}>
                            {statusMessage}
                        </div>
                    )}

                    <div className="card" style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="form-control"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        width: '100%'
                                    }}
                                    value={officeLocation.latitude}
                                    onChange={(e) => setOfficeLocation({ ...officeLocation, latitude: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="form-control"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        width: '100%'
                                    }}
                                    value={officeLocation.longitude}
                                    onChange={(e) => setOfficeLocation({ ...officeLocation, longitude: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                    Radius (meters): {officeLocation.radius}m
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="1000"
                                    step="1"
                                    value={officeLocation.radius}
                                    onChange={(e) => setOfficeLocation({ ...officeLocation, radius: parseInt(e.target.value) })}
                                    style={{ width: '100%', marginTop: '8px' }}
                                />
                            </div>
                        </div>

                        <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden' }}>
                            <MapContainer
                                center={[officeLocation.latitude, officeLocation.longitude]}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                                key={`${officeLocation.latitude}-${officeLocation.longitude}`}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <LocationMarker
                                    position={{ lat: officeLocation.latitude, lng: officeLocation.longitude }}
                                    setPosition={(pos) => setOfficeLocation({ ...officeLocation, latitude: pos.lat, longitude: pos.lng })}
                                    radius={officeLocation.radius}
                                />
                            </MapContainer>
                        </div>

                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span></span>
                            <p style={{ margin: 0 }}><strong>Instructions:</strong> Click anywhere on the map to move the office center point. Adjust the radius slider to change the valid attendance zone.</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default GeofencingSetup;
