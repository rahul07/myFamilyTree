import React, { useState } from 'react';
import './ViewControls.css';

const ViewControls = ({ settings, onSettingsChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (key, value) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className={`view-controls glass-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <button
                className="toggle-controls-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Minimize' : 'Customize View'}
            >
                {isExpanded ? '✕' : '⚙️'}
            </button>

            {isExpanded && (
                <>
                    <div className="control-group">
                        <label>Layout</label>
                        <div className="toggle-group">
                            <button
                                className={`toggle-btn ${settings.layout === 'organic' ? 'active' : ''}`}
                                onClick={() => handleChange('layout', 'organic')}
                                title="Organic (Gravity)"
                            >
                                ⚛️ Organic
                            </button>
                            <button
                                className={`toggle-btn ${settings.layout === 'tree' ? 'active' : ''}`}
                                onClick={() => handleChange('layout', 'tree')}
                                title="Tree (Hierarchical)"
                            >
                                🌳 Tree
                            </button>
                        </div>
                    </div>

                    <div className="control-group">
                        <label>Theme</label>
                        <select
                            value={settings.theme || 'midnight'}
                            onChange={(e) => handleChange('theme', e.target.value)}
                            className="glass-select"
                        >
                            <option value="midnight">Midnight (Dark)</option>
                            <option value="ivory">Ivory (Light)</option>
                            <option value="parchment">Parchment (Vintage)</option>
                        </select>
                    </div>

                    <div className="control-group">
                        <label>Node Shape</label>
                        <div className="toggle-group">
                            <button
                                className={`toggle-btn ${settings.nodeShape === 'circle' ? 'active' : ''}`}
                                onClick={() => handleChange('nodeShape', 'circle')}
                            >
                                ●
                            </button>
                            <button
                                className={`toggle-btn ${settings.nodeShape === 'hexagon' ? 'active' : ''}`}
                                onClick={() => handleChange('nodeShape', 'hexagon')}
                            >
                                ⬡
                            </button>
                        </div>
                    </div>

                    <div className="control-group">
                        <label>Effects</label>
                        <button
                            className={`toggle-btn full-width ${settings.particles ? 'active' : ''}`}
                            onClick={() => handleChange('particles', !settings.particles)}
                        >
                            {settings.particles ? '✨ Particles On' : 'Particles Off'}
                        </button>
                    </div>

                    <div className="control-group">
                        <label>Links</label>
                        <div className="toggle-group">
                            <button
                                className={`toggle-btn ${settings.linkStyle === 'curved' ? 'active' : ''}`}
                                onClick={() => handleChange('linkStyle', 'curved')}
                            >
                                Curved
                            </button>
                            <button
                                className={`toggle-btn ${settings.linkStyle === 'straight' ? 'active' : ''}`}
                                onClick={() => handleChange('linkStyle', 'straight')}
                            >
                                Straight
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ViewControls;
