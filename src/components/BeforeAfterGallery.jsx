import React, { useState } from 'react';

function BeforeAfterGallery({ complaintsData }) {
  const [activeTab, setActiveTab] = useState('all');
  
  // 🔥 NEW: State to track which image is currently clicked/expanded
  const [expandedImage, setExpandedImage] = useState(null);

  // Filter complaints that have at least a 'before' image logged
  const imageComplaints = (complaintsData || []).filter(c => c.beforeImage);

  const filteredComplaints = imageComplaints.filter(c => {
    if (activeTab === 'resolved') return c.status === 'Resolved';
    if (activeTab === 'pending') return c.status !== 'Resolved';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Tab Filter Header */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-slate, #cbd5e1)', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
            backgroundColor: activeTab === 'all' ? 'var(--color-citizen, #2563eb)' : 'transparent',
            color: activeTab === 'all' ? 'white' : 'var(--text-muted, #64748b)'
          }}
        >
          All Visual Logs ({imageComplaints.length})
        </button>
        <button 
          onClick={() => setActiveTab('resolved')}
          style={{
            padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
            backgroundColor: activeTab === 'resolved' ? '#15803d' : 'transparent',
            color: activeTab === 'resolved' ? 'white' : 'var(--text-muted, #64748b)'
          }}
        >
          Resolved Issues ({imageComplaints.filter(c => c.status === 'Resolved').length})
        </button>
        <button 
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
            backgroundColor: activeTab === 'pending' ? '#b45309' : 'transparent',
            color: activeTab === 'pending' ? 'white' : 'var(--text-muted, #64748b)'
          }}
        >
          In Progress ({imageComplaints.filter(c => c.status !== 'Resolved').length})
        </button>
      </div>

      {/* Gallery Grid */}
      {filteredComplaints.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)', backgroundColor: 'var(--bg-card, #fff)', borderRadius: '8px', border: '1px dashed var(--border-slate, #cbd5e1)' }}>
          No visual case issues matching this criteria yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
          {filteredComplaints.map((item) => (
            <div 
              key={item.id} 
              style={{
                backgroundColor: 'var(--bg-card, #fff)', padding: '20px', borderRadius: '8px',
                border: '1px solid var(--border-slate, #cbd5e1)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main, #0f172a)' }}>{item.parkName}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Sector {item.sector} | ID: #{item.id}</p>
                </div>
                <span className="badge" style={{
                  backgroundColor: item.status === 'Resolved' ? '#15803d20' : '#b4530920',
                  color: item.status === 'Resolved' ? '#15803d' : '#b45309',
                  fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', fontSize: '12px'
                }}>
                  {item.status}
                </span>
              </div>

              {/* Dynamic Image Display Container */}
              <div style={{ display: 'grid', gridTemplateColumns: item.afterImage ? '1fr 1fr' : '1fr', gap: '15px', marginTop: '10px' }}>
                
                {/* BEFORE CONTAINER */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(185, 28, 28, 0.85)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', zIndex: 10, pointerEvents: 'none' }}>
                    ⚠️ BEFORE
                  </div>
                  <img 
                    src={item.beforeImage} 
                    alt="Grievance context" 
                    onClick={() => setExpandedImage(item.beforeImage)} //Click handler added
                    style={{ 
                      width: '100%', height: '220px', objectFit: 'cover', borderRadius: '6px', 
                      border: '1px solid var(--border-slate, #cbd5e1)', cursor: 'pointer', transition: 'transform 0.2s' 
                    }} 
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=Image+Unavailable'; }}
                  />
                </div>

                {/* AFTER CONTAINER */}
                {item.afterImage ? (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(21, 128, 61, 0.85)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', zIndex: 10, pointerEvents: 'none' }}>
                      ✅ FIXED
                    </div>
                    <img 
                      src={item.afterImage} 
                      alt="Resolution context" 
                      onClick={() => setExpandedImage(item.afterImage)} // 🔥 Click handler added
                      style={{ 
                        width: '100%', height: '220px', objectFit: 'cover', borderRadius: '6px', 
                        border: '1px solid var(--border-slate, #cbd5e1)', cursor: 'pointer', transition: 'transform 0.2s' 
                      }} 
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-body, #f8fafc)', borderRadius: '6px', border: '1px dashed var(--border-slate, #cbd5e1)', padding: '20px', minHeight: '220px' }}>
                    <span style={{ fontSize: '24px', marginBottom: '8px' }}>🛠️</span>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)', textAlign: 'center', fontWeight: '500' }}>
                      GMDA Maintenance operations are currently active on site.
                    </p>
                  </div>
                )}
              </div>

              {/* Remarks logs */}
              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: 'var(--bg-body, #f8fafc)', borderRadius: '6px', fontSize: '13px' }}>
                <strong>Reported Issue:</strong> <span style={{ color: 'var(--text-muted, #64748b)' }}>{item.issue}</span>
                {item.remarks && (
                  <div style={{ marginTop: '6px' }}>
                    <strong>Resolution Context:</strong> <span style={{ color: 'var(--text-muted, #64748b)' }}>{item.remarks}</span>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 🚀 FULLSCREEN IMAGE MODAL */}
      {expandedImage && (
        <div 
          onClick={() => setExpandedImage(null)} 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 99999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: 'zoom-out'
          }}
        >
          {/* Close Button */}
          <button 
            onClick={() => setExpandedImage(null)}
            style={{
              position: 'absolute', top: '25px', right: '35px',
              background: 'none', border: 'none', color: 'white',
              fontSize: '40px', cursor: 'pointer', padding: '10px'
            }}
          >
            &times;
          </button>
          
          {/* The High-Res Image */}
          <img 
            src={expandedImage} 
            alt="Expanded view" 
            style={{
              maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain',
              borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }} 
          />
        </div>
      )}
    </div>
  );
}

export default BeforeAfterGallery;