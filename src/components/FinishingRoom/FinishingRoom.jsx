import React, { useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import Button from '../UI/Button'
import { useToast } from '../UI/ToastContainer'
import './FinishingRoom.css'

const FinishingRoom = ({ onClose }) => {
    const { showToast } = useToast()
    const [frame, setFrame] = useState('none')
    const [exporting, setExporting] = useState(false)
    const [exportProgress, setExportProgress] = useState(0)

    const handleExport = async (format) => {
        setExporting(true)
        setExportProgress(10)

        const exportTarget = document.querySelector('.app-container')

        // Hide controls
        const hiddenElements = []
        const toHide = ['.app-header', '.dashboard-trigger', '.finishing-controls', '.finishing-close-btn']
        toHide.forEach(selector => {
            const el = document.querySelector(selector)
            if (el) {
                hiddenElements.push({ el, originalDisplay: el.style.display })
                el.style.display = 'none'
            }
        })

        try {
            setExportProgress(25)
            // Add frame class to target
            exportTarget.classList.add(`frame-${frame}`)

            setExportProgress(40)
            const canvas = await html2canvas(exportTarget, {
                backgroundColor: '#0f172a',
                scale: 2,
                useCORS: true
            })

            setExportProgress(70)
            if (format === 'png') {
                const link = document.createElement('a')
                link.download = `aura-family-tree-${Date.now()}.png`
                link.href = canvas.toDataURL()
                link.click()
                showToast('PNG exported successfully!', 'success')
            } else if (format === 'pdf') {
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                })
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height)
                pdf.save(`aura-family-tree-${Date.now()}.pdf`)
                showToast('PDF exported successfully!', 'success')
            }
            setExportProgress(100)
        } catch (err) {
            console.error('Export failed:', err)
            showToast('Export failed. Please try again.', 'error')
        } finally {
            // Restore controls
            hiddenElements.forEach(({ el, originalDisplay }) => {
                el.style.display = originalDisplay
            })
            exportTarget.classList.remove(`frame-${frame}`)
            setExporting(false)
            setExportProgress(0)
        }
    }

    return (
        <div className={`finishing-room-ui`}>
            {/* Visual Frame Overlay (just for preview, actual logic handled in export) */}
            <div className={`frame-preview-overlay frame-${frame}`} />

            <button className="finishing-close-btn" onClick={onClose}>Exit Finishing Room</button>

            <div className="finishing-controls glass-panel">
                <h3>Finishing Room</h3>

                <div className="frame-selector">
                    <label>Select Frame Style:</label>
                    <div className="frames-grid">
                        {['none', 'vintage', 'modern', 'floral', 'neon'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFrame(f)}
                                className={frame === f ? 'active' : ''}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="export-actions">
                    {exporting && exportProgress > 0 && (
                        <div className="export-progress-container">
                            <div className="export-progress-bar">
                                <div
                                    className="export-progress-fill"
                                    style={{ width: `${exportProgress}%` }}
                                />
                            </div>
                            <span className="export-progress-text">{exportProgress}%</span>
                        </div>
                    )}
                    <Button onClick={() => handleExport('png')} disabled={exporting}>
                        {exporting ? 'Exporting...' : 'Download PNG'}
                    </Button>
                    <Button onClick={() => handleExport('pdf')} disabled={exporting}>
                        {exporting ? 'Exporting...' : 'Download PDF'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default FinishingRoom
