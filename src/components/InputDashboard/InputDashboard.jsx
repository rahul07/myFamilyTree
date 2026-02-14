import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import Button from '../UI/Button'
import { useToast } from '../UI/ToastContainer'
import './InputDashboard.css'
import { v4 as uuidv4 } from 'uuid'

const InputDashboard = ({ onAddProfile }) => {
    const { showToast } = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [existingProfiles, setExistingProfiles] = useState([])
    const [photoPreview, setPhotoPreview] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        type: 'human',
        role: 'child',
        life_status: 'living',
        photo_url: '',
        relatedTo: '' // ID of existing profile
    })
    const [uploading, setUploading] = useState(false)

    // Fetch existing profiles when opening dashboard
    useEffect(() => {
        if (isOpen) {
            supabase.from('profiles').select('id, name, role').then(({ data }) => {
                setExistingProfiles(data || [])
            })
        }
    }, [isOpen])

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handlePhotoUpload = async (e) => {
        try {
            setUploading(true)
            const file = e.target.files[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `${uuidv4()}.${fileExt}`
            const filePath = `${fileName}`

            const { data, error } = await supabase.storage
                .from('photos')
                .upload(filePath, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('photos')
                .getPublicUrl(filePath)

            setFormData(prev => ({ ...prev, photo_url: publicUrl }))

            // Create preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setPhotoPreview(reader.result)
            }
            reader.readAsDataURL(file)

            showToast('Photo uploaded successfully!', 'success')
        } catch (error) {
            console.error('Error uploading image: ', error)
            showToast('Error uploading photo. Please try again.', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name) return

        try {
            await onAddProfile({
                name: formData.name,
                age: parseInt(formData.age) || 0,
                type: formData.type,
                role: formData.role,
                life_status: formData.life_status,
                photo_url: formData.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`
            }, {
                targetId: formData.relatedTo,
                type: formData.role
            })

            showToast(`${formData.name} added successfully!`, 'success')

            // Reset form
            setFormData({
                name: '',
                age: '',
                type: 'human',
                role: 'child',
                life_status: 'living',
                photo_url: '',
                relatedTo: '' // Reset
            })
            setPhotoPreview(null)
            setIsOpen(false)
        } catch (error) {
            showToast('Error adding family member. Please try again.', 'error')
            console.error(error)
        }
    }

    if (!isOpen) {
        return (
            <div className="dashboard-trigger">
                <Button onClick={() => setIsOpen(true)} variant="primary">
                    + Add Member
                </Button>
            </div>
        )
    }

    return (
        <div className="input-dashboard glass-panel">
            <div className="dashboard-header">
                <h3>Add Family Member</h3>
                <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ex: Arthur Weasley"
                        required
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Role (Relationship)</label>
                        <select name="role" value={formData.role} onChange={handleChange}>
                            <option value="me">Me (Center)</option>
                            <option value="spouse">Spouse</option>
                            <option value="child">Child</option>
                            <option value="sibling">Sibling</option>
                            <option value="parent">Parent</option>
                            <option value="grandparent">Grandparent</option>
                            <option value="great_grandparent">Great Grandparent</option>
                            <option value="pet">Pet</option>
                        </select>
                    </div>

                    {/* Show 'Related To' unless 'Me' is selected or no other profiles exist */}
                    {formData.role !== 'me' && existingProfiles.length > 0 && (
                        <div className="form-group">
                            <label>Related To</label>
                            <select name="relatedTo" value={formData.relatedTo} onChange={handleChange} required>
                                <option value="">Select a relative...</option>
                                {existingProfiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Age</label>
                        <input
                            type="number"
                            name="age"
                            value={formData.age}
                            onChange={handleChange}
                            placeholder="50"
                        />
                    </div>
                    <div className="form-group">
                        <label>Type</label>
                        <select name="type" value={formData.type} onChange={handleChange}>
                            <option value="human">Human</option>
                            <option value="pet">Pet</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Photo</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                    />
                    {uploading && <span className="upload-status">Uploading...</span>}
                    {photoPreview && (
                        <div className="photo-preview">
                            <img src={photoPreview} alt="Preview" />
                            <button
                                type="button"
                                className="remove-photo"
                                onClick={() => {
                                    setPhotoPreview(null)
                                    setFormData(prev => ({ ...prev, photo_url: '' }))
                                }}
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                <div className="form-actions">
                    <Button type="submit" variant="primary" disabled={uploading}>
                        {uploading ? 'Wait...' : 'Add & Connect'}
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default InputDashboard
